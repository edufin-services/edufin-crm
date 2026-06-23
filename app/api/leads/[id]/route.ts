import { NextRequest, NextResponse } from "next/server";
import { CHANNELS, STAGES } from "@/lib/constants";
import { deleteLead, updateLead } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const { name, company, channel, value, stage } = body ?? {};

  const updates: Partial<{ name: string; company: string; channel: typeof CHANNELS[number]; value: number; stage: typeof STAGES[number] }> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    updates.name = name.trim();
  }
  if (company !== undefined) {
    if (typeof company !== "string" || !company.trim()) {
      return NextResponse.json({ error: "Invalid company." }, { status: 400 });
    }
    updates.company = company.trim();
  }
  if (channel !== undefined) {
    if (!CHANNELS.includes(channel)) {
      return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
    }
    updates.channel = channel;
  }
  if (value !== undefined) {
    if (typeof value !== "number" || value < 0) {
      return NextResponse.json({ error: "Invalid value." }, { status: 400 });
    }
    updates.value = value;
  }
  if (stage !== undefined) {
    if (!STAGES.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }
    updates.stage = stage;
  }

  const lead = updateLead(id, session.userId, updates);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/leads/[id]">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  deleteLead(id, session.userId);
  return NextResponse.json({ success: true });
}
