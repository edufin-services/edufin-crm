import { NextResponse } from "next/server";
import { getAllConversations, getConversationsByOwner } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.userId && !session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = session.isAdmin
    ? await getAllConversations()
    : await getConversationsByOwner(session.userId!);

  return NextResponse.json({ conversations });
}

