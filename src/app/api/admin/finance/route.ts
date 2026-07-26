import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

async function requirePlatformAdmin() {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) return null;
  return ctx;
}

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const finance = await db.platformFinance.findFirst();
  return NextResponse.json({ monthlyExpensesCents: finance?.monthlyExpensesCents ?? 0 });
}

const schema = z.object({ monthlyExpensesCents: z.number().int().nonnegative() });

export async function PATCH(req: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

  const existing = await db.platformFinance.findFirst();
  const updated = existing
    ? await db.platformFinance.update({ where: { id: existing.id }, data: { monthlyExpensesCents: parsed.data.monthlyExpensesCents, updatedBy: ctx.user.email } })
    : await db.platformFinance.create({ data: { monthlyExpensesCents: parsed.data.monthlyExpensesCents, updatedBy: ctx.user.email } });

  return NextResponse.json(updated);
}
