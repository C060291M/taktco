import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ completed: z.boolean().optional(), title: z.string().min(1).optional(), dueDate: z.string().nullable().optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete this." }, { status: 403 });

  const task = await db.task.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.task.update({ where: { id: task.id }, data: { ...(parsed.data.completed !== undefined ? { completed: parsed.data.completed } : {}), ...(parsed.data.title ? { title: parsed.data.title } : {}), ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}) } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete this." }, { status: 403 });

  const task = await db.task.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.task.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}



