import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Restore path for Customer.deletedAt - see the DELETE handler in the
// parent route for the archive side of this. Owner-only, same as delete.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can restore this." }, { status: 403 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: { not: null } } });
  if (!customer) return NextResponse.json({ error: "Not found or not deleted." }, { status: 404 });

  const restored = await db.customer.update({ where: { id: customer.id }, data: { deletedAt: null, status: "active" } });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "restored", entityType: "customer", entityId: customer.id }
  });

  return NextResponse.json(restored);
}