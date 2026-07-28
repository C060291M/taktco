import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  active: z.boolean().optional(),
  displayOrder: z.number().int().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await db.pricingCategory.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!category) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const updated = await db.pricingCategory.update({ where: { id: category.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await db.pricingCategory.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!category) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.pricingCategory.delete({ where: { id: category.id } });
  return NextResponse.json({ ok: true });
}
