import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, seedAccountData } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { name, company, email, password } = body ?? {};

  if (
    typeof name !== "string" ||
    typeof company !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !company.trim() ||
    !email.trim() ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "Please fill in all fields. Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    name: name.trim(),
    company: company.trim(),
    email: email.trim(),
    passwordHash,
  });
  await seedAccountData(user.id);

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, company: user.company },
  });
}
