import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

const schema = z.object({
  suggestions: z.array(z.object({ name: z.string(), unit: z.string(), categoryName: z.string() })).min(1)
});

// Creates the specific suggestions the user checked and approved -
// everything else the AI suggested but the user didn't select is simply
// discarded, never created. Each item lands at price $0 with a note that
// makes it obvious it still needs a real price set.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const existingCategories = await db.pricingCategory.findMany({ where: { companyId: ctx.company.id } });
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let categoryCount = existingCategories.length;
  let itemCount = await db.pricingItem.count({ where: { companyId: ctx.company.id } });

  let created = 0;
  for (const s of parsed.data.suggestions) {
    let category = categoryByName.get(s.categoryName.toLowerCase());
    if (!category) {
      category = await db.pricingCategory.create({ data: { companyId: ctx.company.id, name: s.categoryName, displayOrder: categoryCount } });
      categoryByName.set(s.categoryName.toLowerCase(), category);
      categoryCount++;
    }
    await db.pricingItem.create({
      data: {
        companyId: ctx.company.id,
        categoryId: category.id,
        name: s.name,
        unit: s.unit,
        price: 0,
        notes: "🤖 AI-suggested — set your real price",
        displayOrder: itemCount,
        createdByName: `${ctx.user.name} (AI suggestion, approved)`
      }
    });
    itemCount++;
    created++;
  }

  return NextResponse.json({ created });
}
