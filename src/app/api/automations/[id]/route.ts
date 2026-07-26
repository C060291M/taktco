import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  enabled: z.boolean().optional(),
  order: z.number().optional(),
  name: z.string().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const workflow = await db.automationWorkflow.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!workflow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.automationWorkflow.update({ where: { id: workflow.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await db.automationWorkflow.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!workflow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.automationWorkflow.delete({ where: { id: workflow.id } });
  return NextResponse.json({ ok: true });
}
