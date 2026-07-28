import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await db.pricingItem.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const count = await db.pricingItem.count({ where: { companyId: ctx.company.id } });
  const copy = await db.pricingItem.create({
    data: {
      companyId: ctx.company.id,
      categoryId: item.categoryId,
      name: `${item.name} (copy)`,
      description: item.description,
      unit: item.unit,
      price: item.price,
      cost: item.cost,
      markupPercent: item.markupPercent,
      minCharge: item.minCharge,
      maxCharge: item.maxCharge,
      taxable: item.taxable,
      notes: item.notes,
      customFields: item.customFields as never,
      displayOrder: count,
      createdByName: ctx.user.name
    }
  });

  return NextResponse.json(copy, { status: 201 });
}
