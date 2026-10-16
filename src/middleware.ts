import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { BETA_READ_ONLY_MESSAGE, TRIAL_READ_ONLY_MESSAGE } from "@/lib/accountAccess";

// Read-only guard for closed-beta and free-trial accounts whose window has ended. This is NOT an
// authentication layer: auth is still enforced by requireSession() (src/lib/auth.ts), and this file
// can only ever BLOCK a request, never allow one that requireSession() would refuse. It acts only
// when all of these are true: an API write (POST/PUT/PATCH/DELETE), a valid signed session cookie,
// and an access-window claim in that cookie that is already in the past. Paid accounts carry no
// claim. Anything else - no cookie, no claim, a verification error, any exception - passes straight
// through (fail open), so a bug here can never lock out a normal account.
const SESSION_COOKIE = "novaos_session";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Writes a read-only account may still make: signing in and out, password resets, changing its own
// password, billing (so a trial account can subscribe), marking its own notifications read, plus
// machine and public endpoints that have no session.
const EXEMPT_PREFIXES = [
  "/api/auth/",
  "/api/billing/",
  "/api/users/change-password",
  "/api/notifications",
  "/api/track",
  "/api/webhooks/",
  "/api/public/",
  "/api/admin/"
];

export async function middleware(request: NextRequest) {
  try {
    if (!WRITE_METHODS.has(request.method)) return NextResponse.next();
    const path = request.nextUrl.pathname;
    if (EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return NextResponse.next();

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.next();

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret");
    const { payload } = await jwtVerify(token, secret);
    // accessEndsAt/accessKind are the current claims; betaEndsAt is read for sessions issued
    // before trials existed.
    const endsAt = payload.accessEndsAt ?? payload.betaEndsAt;
    if (typeof endsAt === "number" && Date.now() >= endsAt) {
      if (payload.accessKind === "trial") {
        return NextResponse.json({ error: TRIAL_READ_ONLY_MESSAGE, code: "TRIAL_READ_ONLY" }, { status: 403 });
      }
      return NextResponse.json({ error: BETA_READ_ONLY_MESSAGE, code: "BETA_READ_ONLY" }, { status: 403 });
    }
  } catch {
    // Fail open - see the header comment.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};