import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const category = await db.pricingCategory.findFirst({ where: { id: params.id, companyId: ctx.company.id }, include: { items: true } });
  if (!category) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const count = await db.pricingCategory.count({ where: { companyId: ctx.company.id } });
  const newCategory = await db.pricingCategory.create({
    data: {
      companyId: ctx.company.id,
      name: `${category.name} (copy)`,
      description: category.description,
      color: category.color,
      displayOrder: count,
      items: {
        create: category.items.map((item) => ({
          companyId: ctx.company.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          price: item.price,
          cost: item.cost,
          markupPercent: item.markupPercent,
          minCharge: item.minCharge,
          maxCharge: item.maxCharge,
          taxable: item.taxable,
          notes: item.notes,
          displayOrder: item.displayOrder,
          customFields: item.customFields as never
        }))
      }
    }
  });

  return NextResponse.json(newCategory, { status: 201 });
}
