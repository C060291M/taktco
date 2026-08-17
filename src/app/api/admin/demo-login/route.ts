import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession, createSession, setAdminReturnMarker } from "@/lib/auth";

// Lets a platform admin jump into the seeded demo tenant account to test the
// product as a customer would see it, without typing credentials. Gated on
// isPlatformAdmin - this is a real session switch, not a preview/read-only
// mode, so it's restricted the same way /admin itself is.
//
// Looked up by Company.subdomain === "demo" rather than a hardcoded user
// email - the demo company's name, owner name, and owner email are all
// expected to get customized over time as it doubles as a working test
// account, and a hardcoded email breaks the moment any of that changes.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const demoCompany = await db.company.findUnique({
    where: { subdomain: "demo" },
    include: { users: { orderBy: { createdAt: "asc" } } }
  });
  const demoUser = demoCompany?.users.find((u) => u.role === "OWNER") || demoCompany?.users[0];
  if (!demoCompany || !demoUser) {
    return NextResponse.json({ error: "Demo account not found - run npm run db:seed first." }, { status: 404 });
  }

  const adminUserId = ctx.user.id;
  await createSession({ userId: demoUser.id, companyId: demoUser.companyId, role: demoUser.role });
  await setAdminReturnMarker(adminUserId);
  return NextResponse.json({ ok: true });
}
