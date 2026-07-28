import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

// Simple CSV parser - no external library, handles quoted fields with
// embedded commas since that's the one real edge case a hand-rolled split
// gets wrong. Expects the same column order export/route.ts produces.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || row.length > 0) { row.push(field); rows.push(row); row = []; field = ""; }
      } else field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.csv || typeof body.csv !== "string") return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });

  const rows = parseCsv(body.csv);
  if (rows.length < 2) return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });

  const [, ...dataRows] = rows; // skip header row
  const existingCategories = await db.pricingCategory.findMany({ where: { companyId: ctx.company.id } });
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let categoryCount = existingCategories.length;
  let itemCount = await db.pricingItem.count({ where: { companyId: ctx.company.id } });

  let imported = 0;
  const errors: string[] = [];

  for (const [i, row] of dataRows.entries()) {
    const [categoryName, name, description, unit, price] = row;
    if (!categoryName || !name || !unit || !price) {
      errors.push(`Row ${i + 2}: missing required field (category, name, unit, or price).`);
      continue;
    }
    const priceNum = Number(price);
    if (isNaN(priceNum)) {
      errors.push(`Row ${i + 2}: "${price}" is not a valid price.`);
      continue;
    }

    let category = categoryByName.get(categoryName.toLowerCase());
    if (!category) {
      category = await db.pricingCategory.create({ data: { companyId: ctx.company.id, name: categoryName, displayOrder: categoryCount } });
      categoryByName.set(categoryName.toLowerCase(), category);
      categoryCount++;
    }

    await db.pricingItem.create({
      data: {
        companyId: ctx.company.id,
        categoryId: category.id,
        name,
        description: description || undefined,
        unit,
        price: priceNum,
        displayOrder: itemCount,
        createdByName: ctx.user.name
      }
    });
    itemCount++;
    imported++;
  }

  return NextResponse.json({ imported, errors });
}
