import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  markupPercent: z.number().nullable().optional(),
  minCharge: z.number().nonnegative().nullable().optional(),
  maxCharge: z.number().nonnegative().nullable().optional(),
  taxable: z.boolean().optional(),
  active: z.boolean().optional(),
  favorite: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  categoryId: z.string().optional(),
  customFields: z.record(z.string()).optional(),
  priceChangeReason: z.string().optional() // only used when price changes, not stored on the item itself
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await db.pricingItem.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const { priceChangeReason, ...data } = parsed.data;

  // Log every real price change automatically - this is the version history
  // the spec asks for, built into the normal edit flow rather than a
  // separate step someone has to remember to do.
  if (data.price !== undefined && Number(item.price) !== data.price) {
    await db.pricingItemHistory.create({
      data: {
        pricingItemId: item.id,
        companyId: ctx.company.id,
        oldPrice: item.price,
        newPrice: data.price,
        changedByName: ctx.user.name,
        reason: priceChangeReason
      }
    });
  }

  const updated = await db.pricingItem.update({ where: { id: item.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await db.pricingItem.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.pricingItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
