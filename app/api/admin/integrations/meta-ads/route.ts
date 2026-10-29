import { NextRequest, NextResponse } from "next/server";
import { getAdminSettings, getAllUsers, getNextRoundRobinUser, updateAdminSettings } from "@/lib/db";
import { getSession } from "@/lib/session";

async function inspectMetaToken(token: string) {
  if (!token) {
    return { valid: false, error: "No token configured", notConfigured: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}&fields=id,name`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.id) {
      let isSubscribed = false;
      try {
        const subRes = await fetch(`https://graph.facebook.com/v21.0/${data.id}/subscribed_apps?access_token=${token}`, {
          signal: AbortSignal.timeout(6000),
        });
        const subData = await subRes.json().catch(() => null);
        if (subRes.ok && Array.isArray(subData?.data)) {
          isSubscribed = subData.data.some((app: any) =>
            Array.isArray(app.subscribed_fields) && app.subscribed_fields.includes("leadgen")
          );
        }
      } catch {
        // non-fatal
      }

      return {
        valid: true,
        pageId: data.id,
        pageName: data.name,
        isPageSubscribed: isSubscribed,
      };
    }

    return {
      valid: false,
      error: data?.error?.message || `HTTP ${res.status}`,
      errorType: data?.error?.type,
      errorCode: data?.error?.code,
      errorSubcode: data?.error?.error_subcode,
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

  const tokenInDb = (settings as any)?.metaPageAccessToken || "";
  const tokenInEnv = process.env.META_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
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
  const tokenInDb = (settings as any)?.metaPageAccessToken || "";
  const tokenInEnv = process.env.META_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
  const effectiveToken = tokenInDb || tokenInEnv;

  if (!effectiveToken) {
    return NextResponse.json({ error: "No Meta Page Access Token configured." }, { status: 400 });
  }

  try {
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${effectiveToken}&fields=id,name`, {
      signal: AbortSignal.timeout(6000),
    });
    const pageData = await pageRes.json().catch(() => null);

    if (!pageRes.ok || !pageData?.id) {
      return NextResponse.json(
        { error: pageData?.error?.message || "Cannot access Facebook Page. Token may be expired or invalid." },
        { status: 400 }
      );
    }

    const subRes = await fetch(`https://graph.facebook.com/v21.0/${pageData.id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscribed_fields: ["leadgen"],
        access_token: effectiveToken,
      }),
      signal: AbortSignal.timeout(6000),
    });

    const subData = await subRes.json().catch(() => null);

    if (subRes.ok && (subData?.success || subData?.data)) {
      return NextResponse.json({
        success: true,
        message: `Successfully subscribed page "${pageData.name}" (${pageData.id}) to real-time Leadgen Webhooks!`,
        pageId: pageData.id,
        pageName: pageData.name,
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
  if (typeof body.metaPageAccessToken === "string") {
    updates.metaPageAccessToken = body.metaPageAccessToken.trim();
  }
  if (typeof body.metaVerifyToken === "string" && body.metaVerifyToken.trim()) {
    updates.metaVerifyToken = body.metaVerifyToken.trim();
  }

  const updated = await updateAdminSettings(updates);
  const effectiveToken = (updated as any)?.metaPageAccessToken || process.env.META_PAGE_ACCESS_TOKEN || "";
  const tokenInspection = await inspectMetaToken(effectiveToken);

  return NextResponse.json({
    success: true,
    message: "Meta Lead Ads configuration updated successfully.",
    verifyToken: (updated as any)?.metaVerifyToken || "fx_meta_leads_token_2026",
    hasPageAccessToken: !!(updated as any)?.metaPageAccessToken,
    tokenInspection,
  });
}
