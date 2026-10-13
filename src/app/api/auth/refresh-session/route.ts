import { NextResponse } from "next/server";
import { requireSession, createSession } from "@/lib/auth";
import { betaClaim } from "@/lib/betaStatus";

// Re-issues the session cookie so its closed-beta claim matches the database
// (for example after an admin extends a beta). Identity comes from the existing
// valid session; nothing in the request body is trusted.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await createSession({
    userId: ctx.user.id,
    companyId: ctx.user.companyId,
    role: ctx.user.role,
    ...betaClaim(ctx.company.betaEndsAt)
  });
  return NextResponse.json({ ok: true });
}