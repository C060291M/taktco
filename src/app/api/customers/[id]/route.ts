import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const CUSTOMER_STATUSES = [
  "lead",
  "estimate_pending",
  "estimate_sent",
  "negotiation",
  "active",
  "completed",
  "repeat_customer",
  "problem_client",
  "inactive",
  "archived"
] as const;

const schema = z.object({
  flagged: z.boolean().optional(),
  flagReason: z.string().nullable().optional(),
  vip: z.boolean().optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  assignedUserId: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.customer.update({
    where: { id: customer.id },
    data: parsed.data
  });

  const action = parsed.data.flagged !== undefined
    ? (parsed.data.flagged ? "flagged" : "unflagged")
    : parsed.data.vip !== undefined
    ? (parsed.data.vip ? "marked_vip" : "unmarked_vip")
    : parsed.data.status !== undefined
    ? "status_changed"
    : parsed.data.assignedUserId !== undefined
    ? "reassigned"
    : "updated";

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action, entityType: "customer", entityId: customer.id }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.customer.update({ where: { id: customer.id }, data: { deletedAt: new Date(), status: "archived" } });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "archived", entityType: "customer", entityId: customer.id }
  });

  return NextResponse.json({ ok: true });
}
