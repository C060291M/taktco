import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { pickStarterTemplate } from "@/lib/pricingMatrix";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

// Loads the starter template matching the company's trade type - only
// callable when the Pricing Matrix is genuinely empty, so this can never
// silently duplicate categories on a company that's already built out real
// pricing.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existingCount = await db.pricingCategory.count({ where: { companyId: ctx.company.id } });
  if (existingCount > 0) {
    return NextResponse.json({ error: "Pricing Matrix already has categories - starter templates only load into an empty matrix." }, { status: 400 });
  }

  const template = pickStarterTemplate(ctx.company.tradeType);

  for (const [catIndex, cat] of template.entries()) {
    await db.pricingCategory.create({
      data: {
        companyId: ctx.company.id,
        name: cat.category,
        displayOrder: catIndex,
        items: {
          create: cat.items.map((item, itemIndex) => ({
            companyId: ctx.company.id,
            name: item.name,
            unit: item.unit,
            price: item.price,
            displayOrder: itemIndex
          }))
        }
      }
    });
  }

  return NextResponse.json({ ok: true, categoriesCreated: template.length });
}
