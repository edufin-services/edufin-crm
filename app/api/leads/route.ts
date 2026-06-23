import { NextRequest, NextResponse } from "next/server";
import { CHANNELS, STAGES } from "@/lib/constants";
import { createLead, getLeadsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leads = getLeadsByOwner(session.userId);
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { name, company, channel, value, stage } = body ?? {};

  if (
    typeof name !== "string" ||
    typeof company !== "string" ||
    !name.trim() ||
    !company.trim() ||
    !CHANNELS.includes(channel) ||
    typeof value !== "number" ||
    value < 0 ||
    !STAGES.includes(stage)
  ) {
    return NextResponse.json({ error: "Please fill in all fields with valid values." }, { status: 400 });
  }

  const lead = createLead({ ownerId: session.userId, name: name.trim(), company: company.trim(), channel, value, stage });
  return NextResponse.json({ lead });
}
