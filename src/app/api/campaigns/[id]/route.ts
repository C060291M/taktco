import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Soft delete, same pattern as Customer/Job/Invoice/Estimate. Owner/Admin
// only. Nothing else references a Campaign so this is technically safe as
// a hard delete too, but kept soft for a consistent admin experience and
// to preserve real delivery stats as record-keeping history.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can delete campaigns." }, { status: 403 });
  }

  const campaign = await db.campaign.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null } });
  if (!campaign) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.campaign.update({ where: { id: campaign.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

