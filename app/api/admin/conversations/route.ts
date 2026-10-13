import { NextResponse } from "next/server";
import { getAllConversations } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversations = await getAllConversations();
  return NextResponse.json({ conversations });
}
