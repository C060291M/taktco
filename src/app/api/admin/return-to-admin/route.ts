import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { createSession, getAdminReturnMarker, clearAdminReturnMarker } from "@/lib/auth";

// The other half of demo-login's marker cookie - switches straight back to
// whichever admin last used "Open demo account", without a fresh
// email/password login. Re-verifies isPlatformAdmin on the stored user
// before creating a session, so a tampered cookie value can't grant access
// to an account that isn't actually an admin.
export async function POST() {
  const adminUserId = await getAdminReturnMarker();
  if (!adminUserId) {
    return NextResponse.json({ error: "No admin account to return to." }, { status: 404 });
  }

  const adminUser = await db.user.findUnique({ where: { id: adminUserId } });
  if (!adminUser || !adminUser.isPlatformAdmin) {
    await clearAdminReturnMarker();
    return NextResponse.json({ error: "That account is no longer a platform admin." }, { status: 403 });
  }

  await createSession({ userId: adminUser.id, companyId: adminUser.companyId, role: adminUser.role });
  await clearAdminReturnMarker();
  return NextResponse.json({ ok: true });
}
