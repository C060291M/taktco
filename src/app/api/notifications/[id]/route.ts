import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ read: z.boolean().optional(), archived: z.boolean().optional() });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const notification = await db.notification.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!notification) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.notification.update({ where: { id: notification.id }, data: parsed.data });
  return NextResponse.json(updated);
}
