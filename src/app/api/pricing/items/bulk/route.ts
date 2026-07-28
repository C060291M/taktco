import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

// One endpoint for every bulk action the spec asks for (mass price
// increase/decrease, mass markup adjustment, bulk activate/deactivate) -
// same shape of operation each time (act on a set of item ids), just a
// different mutation, so one route with an `action` discriminator instead
// of five near-identical ones.
const schema = z.object({
  itemIds: z.array(z.string()).min(1),
  action: z.enum(["price_percent_change", "set_active", "set_markup"]),
  percent: z.number().optional(), // for price_percent_change: +10 = increase 10%, -10 = decrease 10%
  active: z.boolean().optional(), // for set_active
  markupPercent: z.number().optional() // for set_markup
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid bulk request." }, { status: 400 });

  const items = await db.pricingItem.findMany({ where: { id: { in: parsed.data.itemIds }, companyId: ctx.company.id } });
  if (items.length === 0) return NextResponse.json({ error: "No matching items." }, { status: 404 });

  if (parsed.data.action === "set_active") {
    await db.pricingItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { active: parsed.data.active ?? true } });
  } else if (parsed.data.action === "set_markup") {
    await db.pricingItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { markupPercent: parsed.data.markupPercent } });
  } else if (parsed.data.action === "price_percent_change") {
    const percent = parsed.data.percent ?? 0;
    // Individually, not updateMany, since each item's new price depends on
    // its own current price - and each change gets logged to history the
    // same way a single manual edit would.
    for (const item of items) {
      const newPrice = Math.round(Number(item.price) * (1 + percent / 100) * 100) / 100;
      await db.pricingItemHistory.create({
        data: { pricingItemId: item.id, companyId: ctx.company.id, oldPrice: item.price, newPrice, changedByName: ctx.user.name, reason: `Bulk price ${percent >= 0 ? "increase" : "decrease"} of ${Math.abs(percent)}%` }
      });
      await db.pricingItem.update({ where: { id: item.id }, data: { price: newPrice } });
    }
  }

  return NextResponse.json({ ok: true, count: items.length });
}
