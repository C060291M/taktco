import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ name: z.string().min(1), color: z.string().optional() });

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tags = await db.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a tag name." }, { status: 400 });

  const existing = await db.tag.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const tag = await db.tag.create({
    data: { companyId: ctx.company.id, name: parsed.data.name, color: parsed.data.color || "#3B82F6" }
  });
  return NextResponse.json(tag, { status: 201 });
}
