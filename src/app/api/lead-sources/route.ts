import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ name: z.string().min(1) });

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sources = await db.leadSource.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } });
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a source name." }, { status: 400 });

  const existing = await db.leadSource.findFirst({ where: { companyId: ctx.company.id, name: parsed.data.name } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const source = await db.leadSource.create({ data: { companyId: ctx.company.id, name: parsed.data.name } });
  return NextResponse.json(source, { status: 201 });
}
