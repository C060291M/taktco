import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ tagId: z.string() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tag." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  const tag = await db.tag.findFirst({ where: { id: parsed.data.tagId, companyId: ctx.company.id } });
  if (!tag) return NextResponse.json({ error: "Tag not found." }, { status: 404 });

  await db.customerTag.upsert({
    where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
    create: { customerId: customer.id, tagId: tag.id },
    update: {}
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid tag." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  await db.customerTag.deleteMany({ where: { customerId: customer.id, tagId: parsed.data.tagId } });
  return NextResponse.json({ ok: true });
}
