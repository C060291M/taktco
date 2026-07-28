import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function csvEscape(val: unknown) {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx || ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.pricingItem.findMany({ where: { companyId: ctx.company.id }, include: { category: true }, orderBy: { displayOrder: "asc" } });

  const header = ["Category", "Name", "Description", "Unit", "Price", "Cost", "Markup %", "Min Charge", "Max Charge", "Taxable", "Active", "Notes"];
  const rows = items.map((i) => [
    i.category.name, i.name, i.description, i.unit, i.price, i.cost, i.markupPercent, i.minCharge, i.maxCharge, i.taxable, i.active, i.notes
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pricing-matrix.csv"`
    }
  });
}
