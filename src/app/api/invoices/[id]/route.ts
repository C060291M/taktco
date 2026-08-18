import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

// Soft delete, same reasoning as Customer.deletedAt - invoices are a
// financial record. Nothing is destroyed; the invoice number is never
// reissued (see lib/documentNumbers.ts), and payments already recorded
// against it stay intact for accounting history.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete this." }, { status: 403 });

  const invoice = await db.invoice.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null } });
  if (!invoice) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.invoice.update({ where: { id: invoice.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
