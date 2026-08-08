import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
function canView(role: string) {
  return role !== "FIELD_TECH";
}

// Smart search across item, description, unit, notes, and custom field
// values - not just the item name.
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canView(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const categoryId = req.nextUrl.searchParams.get("categoryId") || undefined;
  const favoritesOnly = req.nextUrl.searchParams.get("favorites") === "true";

  const items = await db.pricingItem.findMany({
    where: {
      companyId: ctx.company.id,
      ...(categoryId ? { categoryId } : {}),
      ...(favoritesOnly ? { favorite: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { unit: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { displayOrder: "asc" },
    include: { category: true }
  });

  return NextResponse.json(items);
}

const schema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().min(1),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
  markupPercent: z.number().optional(),
  minCharge: z.number().nonnegative().optional(),
  maxCharge: z.number().nonnegative().optional(),
  taxable: z.boolean().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.string()).optional(),
  parentItemId: z.string().optional() // set to create this item as an add-on of another
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the required fields." }, { status: 400 });

  const category = await db.pricingCategory.findFirst({ where: { id: parsed.data.categoryId, companyId: ctx.company.id } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  if (parsed.data.parentItemId) {
    const parent = await db.pricingItem.findFirst({ where: { id: parsed.data.parentItemId, companyId: ctx.company.id } });
    if (!parent) return NextResponse.json({ error: "Parent item not found." }, { status: 404 });
  }

  const count = await db.pricingItem.count({ where: { companyId: ctx.company.id } });
  const item = await db.pricingItem.create({
    data: {
      companyId: ctx.company.id,
      categoryId: category.id,
      name: parsed.data.name,
      description: parsed.data.description,
      unit: parsed.data.unit,
      price: parsed.data.price,
      cost: parsed.data.cost,
      markupPercent: parsed.data.markupPercent,
      minCharge: parsed.data.minCharge,
      maxCharge: parsed.data.maxCharge,
      taxable: parsed.data.taxable ?? true,
      notes: parsed.data.notes,
      customFields: parsed.data.customFields ?? {},
      parentItemId: parsed.data.parentItemId,
      displayOrder: count,
      createdByName: ctx.user.name
    }
  });

  return NextResponse.json(item, { status: 201 });
}
