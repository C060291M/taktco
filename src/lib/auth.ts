import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { SessionPayload } from "@/types";

const SESSION_COOKIE = "novaos_session";
// Set when a platform admin switches into the demo account (or any other
// tenant), so a "Return to admin" control can bring them straight back
// without logging out and back in. httpOnly since it's only ever read
// server-side; the return route re-verifies isPlatformAdmin on the stored
// user before trusting it, so this cookie can't itself grant access to
// anything - it's just a "who to switch back to" pointer.
const ADMIN_RETURN_COOKIE = "novaos_admin_return_id";
const secretKey = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret");

export async function setAdminReturnMarker(adminUserId: string) {
  cookies().set(ADMIN_RETURN_COOKIE, adminUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 // 1 day - this is a short-lived "how to get back" pointer, not a real session
  });
}

export async function getAdminReturnMarker() {
  return cookies().get(ADMIN_RETURN_COOKIE)?.value ?? null;
}

export async function clearAdminReturnMarker() {
  cookies().delete(ADMIN_RETURN_COOKIE);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Loads the current user + company, scoping every downstream query to companyId.
// This is the single choke point that enforces multi-tenant isolation at the app layer,
// on top of the fact that every Prisma query below also filters by companyId explicitly.
export async function requireSession() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { company: true }
  });
  if (!user || user.companyId !== session.companyId) return null;
  return { session, user, company: user.company };
}
