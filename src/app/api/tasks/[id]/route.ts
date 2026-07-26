import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ completed: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const task = await db.task.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.task.update({ where: { id: task.id }, data: { completed: parsed.data.completed } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await db.task.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.task.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
