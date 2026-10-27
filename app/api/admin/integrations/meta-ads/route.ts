import { NextRequest, NextResponse } from "next/server";
import { getAdminSettings, getAllUsers, getNextRoundRobinUser, updateAdminSettings } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getAdminSettings();
  const allUsers = await getAllUsers();

  const tokenInEnv = process.env.META_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
  const tokenInDb = (settings as any)?.metaPageAccessToken || "";
  const effectiveToken = tokenInDb || tokenInEnv;

  const verifyToken =
    (settings as any)?.metaVerifyToken ||
    process.env.META_VERIFY_TOKEN ||
    "fx_meta_leads_token_2026";

  const counselors = allUsers.filter(
    (u) => ((u as any).role === "user" || !(u as any).role)
  );

  const activeCounselors = counselors.filter((u) => !u.isLeadPaused);

  return NextResponse.json({
    configured: !!effectiveToken,
    hasPageAccessToken: !!effectiveToken,
    pageAccessTokenMasked: effectiveToken
      ? `${effectiveToken.slice(0, 8)}...${effectiveToken.slice(-6)}`
      : "",
    verifyToken,
    source: tokenInDb ? "database" : tokenInEnv ? "env" : "none",
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

  return NextResponse.json({
    success: true,
    message: "Meta Lead Ads configuration updated successfully.",
    verifyToken: (updated as any)?.metaVerifyToken || "fx_meta_leads_token_2026",
    hasPageAccessToken: !!(updated as any)?.metaPageAccessToken,
  });
}
