import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const patchSchema = z.object({
  scope: z.string().trim().max(4000).optional(),
  agreedAmount: z.coerce.number().min(0).max(100000000).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  const r = await db.jobSubcontract.updateMany({ where: { id: params.id, companyId: ctx.company.id }, data: parsed.data });
  if (r.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r = await db.jobSubcontract.deleteMany({ where: { id: params.id, companyId: ctx.company.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}