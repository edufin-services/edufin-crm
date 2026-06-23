import { NextRequest, NextResponse } from "next/server";
import { createResetToken, getUserByEmail } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email } = body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
  }

  const user = getUserByEmail(email);

  // Always respond with success to avoid revealing whether an account exists.
  if (user) {
    const { token } = createResetToken(user.id);
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token}`;
    // No email provider configured yet — log the reset link for development.
    console.log(`[forgot-password] Reset link for ${user.email}: ${resetUrl}`);
  }

  return NextResponse.json({ success: true });
}
