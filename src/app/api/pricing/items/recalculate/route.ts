import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

// Recalculates Price = Cost * (1 + Markup% / 100) for every item in the
// company that has a Cost set, regardless of when it was created - fixes
// items saved before the auto-calculate feature existed, or any item where
// Price and Cost/Markup have drifted out of sync. Items without a Cost are
// left untouched, since there's nothing to calculate from.
export async function POST(_req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.pricingItem.findMany({
    where: { companyId: ctx.company.id, cost: { not: null } }
  });

  let updated = 0;
  for (const item of items) {
    const cost = Number(item.cost);
    if (cost <= 0) continue;
    const markup = item.markupPercent ? Number(item.markupPercent) : 0;
    const newPrice = Math.round(cost * (1 + markup / 100) * 100) / 100;
    if (newPrice !== Number(item.price)) {
      await db.pricingItem.update({ where: { id: item.id }, data: { price: newPrice } });
      updated++;
    }
  }

  return NextResponse.json({ updated, checked: items.length });
}
