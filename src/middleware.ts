import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Deliberately a safe no-op passthrough for Phase 1. Auth is fully enforced today
// via requireSession() in src/lib/auth.ts, called from every (dashboard) layout -
// that's the tested, working guard. This file exists so the Next.js middleware
// seam is in place (per the required folder structure) without introducing an
// untested second auth-decision layer on top of the one that already works.
// See src/middleware/publicPaths.ts for the follow-up plan.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: []
};
