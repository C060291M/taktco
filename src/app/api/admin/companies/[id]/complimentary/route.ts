import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ on: z.boolean() });

// Platform-admin only. Turns the "complimentary" flag on or off for one company. While it is on the
// company is never locked for payment and never runs out of AI credits. Audited.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const company = await db.company.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  await db.company.update({ where: { id: company.id }, data: { complimentary: parsed.data.on } });
  await db.auditLog.create({
    data: { companyId: company.id, userId: ctx.user.id, action: parsed.data.on ? "complimentary_on" : "complimentary_off", entityType: "company", entityId: company.id }
  });
  return NextResponse.json({ ok: true, complimentary: parsed.data.on });
}