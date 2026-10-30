import { NextRequest, NextResponse } from "next/server";
import { getAdminSettings, getAllUsers, getNextRoundRobinUser, updateAdminSettings } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function inspectMetaToken(token: string) {
  if (!token) {
    return { valid: false, error: "No token configured", notConfigured: true };
  }

  try {
    // 1. Query /me to get identity
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}&fields=id,name`, {
      signal: AbortSignal.timeout(7000),
    });
    const meData = await meRes.json().catch(() => null);

    if (!meRes.ok || !meData?.id) {
      return {
        valid: false,
        error: meData?.error?.message || `HTTP ${meRes.status}`,
        errorType: meData?.error?.type,
        errorCode: meData?.error?.code,
        errorSubcode: meData?.error?.error_subcode,
      };
    }

    // 2. Check /me/accounts to see if this is a System User or User token managing Facebook Pages
    let resolvedPageId = meData.id;
    let resolvedPageName = meData.name;
    let resolvedPageAccessToken = token;
    let tokenType: "PAGE" | "SYSTEM_USER" = "PAGE";
    let systemUserName = "";
    let systemUserId = "";

    try {
      const accRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`, {
        signal: AbortSignal.timeout(7000),
      });
      const accData = await accRes.json().catch(() => null);

      if (accRes.ok && Array.isArray(accData?.data) && accData.data.length > 0) {
        tokenType = "SYSTEM_USER";
        systemUserId = meData.id;
        systemUserName = meData.name;

        // Pick the managed Page (e.g. EduFin Services)
        const page = accData.data[0];
        resolvedPageId = page.id;
        resolvedPageName = page.name;
        resolvedPageAccessToken = page.access_token || token;
      }
    } catch {
      // non-fatal
    }

    // 3. Check whether the resolved Facebook Page is subscribed to leadgen Webhooks
    let isSubscribed = false;
    let subscribedAppName = "";
    let subscribedAppId = "";

    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${resolvedPageId}/subscribed_apps?access_token=${resolvedPageAccessToken}`,
        { signal: AbortSignal.timeout(7000) }
      );
      const subData = await subRes.json().catch(() => null);

      if (subRes.ok && Array.isArray(subData?.data)) {
        const app = subData.data.find((a: any) =>
          Array.isArray(a.subscribed_fields) && a.subscribed_fields.includes("leadgen")
        );
        if (app) {
          isSubscribed = true;
          subscribedAppName = app.name || "";
          subscribedAppId = app.id || "";
        }
      }
    } catch {
      // non-fatal
    }

    return {
      valid: true,
      tokenType,
      systemUserId,
      systemUserName,
      pageId: resolvedPageId,
      pageName: resolvedPageName,
      pageAccessToken: resolvedPageAccessToken,
      isPageSubscribed: isSubscribed,
      subscribedAppName,
      subscribedAppId,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || "Failed to query Meta Graph API",
    };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettings();
  const allUsers = await getAllUsers();

  const tokenInDb =
    (settings as any)?.metaPageAccessToken ||
    (settings as any)?.metaSystemUserToken ||
    "";
  const tokenInEnv =
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    "";
  const effectiveToken = tokenInDb || tokenInEnv;

  const verifyToken =
    (settings as any)?.metaVerifyToken ||
    process.env.META_VERIFY_TOKEN ||
    "fx_meta_leads_token_2026";

  const counselors = allUsers.filter(
    (u) => ((u as any).role === "user" || !(u as any).role)
  );

  const activeCounselors = counselors.filter((u) => !u.isLeadPaused);
  const tokenInspection = await inspectMetaToken(effectiveToken);

  return NextResponse.json({
    configured: !!effectiveToken,
    hasPageAccessToken: !!effectiveToken,
    pageAccessTokenMasked: effectiveToken
      ? `${effectiveToken.slice(0, 8)}...${effectiveToken.slice(-6)}`
      : "",
    verifyToken,
    source: tokenInDb ? "database" : tokenInEnv ? "env" : "none",
    tokenInspection,
    counselors: counselors.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      branchName: c.branchName || "Main Office",
      isLeadPaused: !!c.isLeadPaused,
      leadPauseReason: c.leadPauseReason || "",
    })),
    totalCounselors: counselors.length,
    activeCounselorsCount: activeCounselors.length,
    distributionMode:
      activeCounselors.length === 1
        ? `Dedicated Single Counselor (${activeCounselors[0]?.name} receives 100% of leads)`
        : activeCounselors.length > 1
        ? `Round-Robin active across ${activeCounselors.length} counselors`
        : "Admin fallback (No active counselors)",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettings();
  const tokenInDb =
    (settings as any)?.metaPageAccessToken ||
    (settings as any)?.metaSystemUserToken ||
    "";
  const tokenInEnv =
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    "";
  const effectiveToken = tokenInDb || tokenInEnv;

  if (!effectiveToken) {
    return NextResponse.json({ error: "No Meta Access Token configured." }, { status: 400 });
  }

  const inspection = await inspectMetaToken(effectiveToken);
  if (!inspection.valid || !inspection.pageId) {
    return NextResponse.json(
      { error: inspection.error || "Cannot validate token with Meta Graph API." },
      { status: 400 }
    );
  }

  const targetPageId = inspection.pageId;
  const targetToken = inspection.pageAccessToken || effectiveToken;

  try {
    const subRes = await fetch(`https://graph.facebook.com/v21.0/${targetPageId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["leadgen"],
        access_token: targetToken,
      }),
      signal: AbortSignal.timeout(7000),
    });

    const subData = await subRes.json().catch(() => null);

    if (subRes.ok && (subData?.success || subData?.data)) {
      if (inspection.pageAccessToken && inspection.pageAccessToken !== (settings as any)?.metaPageAccessToken) {
        await updateAdminSettings({
          metaPageAccessToken: inspection.pageAccessToken,
          metaSystemUserToken: effectiveToken,
          metaPageId: inspection.pageId,
          metaPageName: inspection.pageName,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully subscribed page "${inspection.pageName}" (${targetPageId}) to real-time Leadgen Webhooks!`,
        pageId: targetPageId,
        pageName: inspection.pageName,
      });
    }

    return NextResponse.json(
      { error: subData?.error?.message || "Failed to subscribe Page to Webhooks." },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reach Meta Graph API" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  let rawToken = "";
  if (typeof body.metaPageAccessToken === "string") {
    rawToken = body.metaPageAccessToken.trim();
  }
  if (typeof body.metaVerifyToken === "string" && body.metaVerifyToken.trim()) {
    updates.metaVerifyToken = body.metaVerifyToken.trim();
  }

  let tokenInspection: any = null;

  if (rawToken) {
    tokenInspection = await inspectMetaToken(rawToken);
    if (tokenInspection.valid) {
      // Store both the resolved Page token and the System User token
      updates.metaPageAccessToken = tokenInspection.pageAccessToken || rawToken;
      updates.metaSystemUserToken = rawToken;
      updates.metaPageId = tokenInspection.pageId;
      updates.metaPageName = tokenInspection.pageName;

      // Automatically auto-subscribe Page to webhooks if not already subscribed
      if (!tokenInspection.isPageSubscribed && tokenInspection.pageId) {
        try {
          const autoSub = await fetch(
            `https://graph.facebook.com/v21.0/${tokenInspection.pageId}/subscribed_apps`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscribed_fields: ["leadgen"],
                access_token: tokenInspection.pageAccessToken || rawToken,
              }),
              signal: AbortSignal.timeout(7000),
            }
          );
          const autoSubData = await autoSub.json().catch(() => null);
          if (autoSub.ok && (autoSubData?.success || autoSubData?.data)) {
            tokenInspection.isPageSubscribed = true;
          }
        } catch {
          // non-fatal
        }
      }
    } else {
      updates.metaPageAccessToken = rawToken;
    }
  }

  const updated = await updateAdminSettings(updates);
  const effectiveToken =
    (updated as any)?.metaPageAccessToken ||
    (updated as any)?.metaSystemUserToken ||
    "";

  if (!tokenInspection) {
    tokenInspection = await inspectMetaToken(effectiveToken);
  }

  return NextResponse.json({
    success: true,
    message: "Meta Lead Ads configuration updated successfully.",
    verifyToken: (updated as any)?.metaVerifyToken || "fx_meta_leads_token_2026",
    hasPageAccessToken: !!effectiveToken,
    tokenInspection,
  });
}
