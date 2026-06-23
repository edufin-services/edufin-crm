import { NextResponse } from "next/server";
import { getConversationsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = getConversationsByOwner(session.userId);
  return NextResponse.json({ conversations });
}
