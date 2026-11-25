import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  trade: z.string().trim().max(80).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const subs = await db.subcontractor.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { name: "asc" } });
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter the subcontractor's name." }, { status: 400 });
  const sub = await db.subcontractor.create({
    data: { companyId: ctx.company.id, name: parsed.data.name, trade: parsed.data.trade || null, email: parsed.data.email || null, phone: parsed.data.phone || null }
  });
  return NextResponse.json(sub, { status: 201 });
}