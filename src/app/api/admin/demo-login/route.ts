import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession, createSession } from "@/lib/auth";

// Lets a platform admin jump into the seeded demo tenant account to test the
// product as a customer would see it, without typing credentials. Gated on
// isPlatformAdmin - this is a real session switch, not a preview/read-only
// mode, so it's restricted the same way /admin itself is.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const demoUser = await db.user.findUnique({ where: { email: "owner@demo.novaos.app" } });
  if (!demoUser) {
    return NextResponse.json({ error: "Demo account not found - run npm run db:seed first." }, { status: 404 });
  }

  await createSession({ userId: demoUser.id, companyId: demoUser.companyId, role: demoUser.role });
  return NextResponse.json({ ok: true });
}
