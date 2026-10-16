import { NextResponse } from "next/server";
import { requireSession, createSession } from "@/lib/auth";
import { accessClaim } from "@/lib/accountAccess";

// Re-issues the session cookie so its beta/trial claims match the database (for example after an
// admin extends a window, or after the company subscribes). Identity comes from the existing
// valid session; nothing in the request body is trusted.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await createSession({
    userId: ctx.user.id,
    companyId: ctx.user.companyId,
    role: ctx.user.role,
    ...accessClaim(ctx.company)
  });
  return NextResponse.json({ ok: true });
}