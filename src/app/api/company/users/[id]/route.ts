import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["ADMIN", "SALES_REP", "FIELD_TECH"])
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the account owner can change roles." }, { status: 403 });
  }

  const target = await db.user.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The owner's role can't be changed here." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

  const updated = await db.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  return NextResponse.json({ id: updated.id, role: updated.role });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the account owner can remove team members." }, { status: 403 });
  }

  const target = await db.user.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (target.id === ctx.user.id) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The owner can't be removed." }, { status: 400 });
  }

  await db.user.delete({ where: { id: target.id } });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "user_removed", entityType: "user", entityId: target.id }
  });

  return NextResponse.json({ ok: true });
}
