import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ status: z.enum(["PENDING", "COMPLETED", "CANCELED"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const followUp = await db.followUp.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!followUp) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.followUp.update({ where: { id: followUp.id }, data: { status: parsed.data.status } });
  return NextResponse.json(updated);
}
