import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ content: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Note can't be empty." }, { status: 400 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete this." }, { status: 403 });

  const note = await db.note.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!note) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const updated = await db.note.update({ where: { id: note.id }, data: { content: parsed.data.content } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete this." }, { status: 403 });

  const note = await db.note.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!note) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.note.delete({ where: { id: note.id } });
  return NextResponse.json({ ok: true });
}

