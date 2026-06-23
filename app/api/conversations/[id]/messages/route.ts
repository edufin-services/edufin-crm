import { NextRequest, NextResponse } from "next/server";
import { createMessage, getConversationById, getMessagesByConversation } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const conversation = getConversationById(id, session.userId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = getMessagesByConversation(id, session.userId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]/messages">) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const { text } = body ?? {};

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  const message = createMessage(id, session.userId, "me", text.trim());
  if (!message) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ message });
}
