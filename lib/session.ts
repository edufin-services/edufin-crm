import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId?: string;
  isAdmin?: boolean;
  expiresAt: number;
};

const DEFAULT_DURATION_DAYS = 30;

export async function encrypt(payload: SessionPayload, durationSec?: number) {
  const maxAgeSec = durationSec ?? DEFAULT_DURATION_DAYS * 24 * 60 * 60;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, rememberMe = true) {
  const durationDays = rememberMe ? DEFAULT_DURATION_DAYS : 1;
  const durationSec = durationDays * 24 * 60 * 60;
  const expiresAt = Date.now() + durationSec * 1000;
  const session = await encrypt({ userId, expiresAt }, durationSec);
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: durationSec,
    expires: new Date(expiresAt),
  });
}

export async function createAdminSession(rememberMe = true) {
  const durationDays = rememberMe ? DEFAULT_DURATION_DAYS : 1;
  const durationSec = durationDays * 24 * 60 * 60;
  const expiresAt = Date.now() + durationSec * 1000;
  const session = await encrypt({ isAdmin: true, expiresAt }, durationSec);
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: durationSec,
    expires: new Date(expiresAt),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
