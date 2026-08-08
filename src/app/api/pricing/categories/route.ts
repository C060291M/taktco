import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Manage permission per spec: Owner/Admin full access, Sales read-only,
// Field Tech no access. Mapped onto the existing role system rather than
// inventing a new "Estimator" tier.
function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
function canView(role: string) {
  return role !== "FIELD_TECH";
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx || !canView(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await db.pricingCategory.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        where: { parentItemId: null }, // top-level items only - add-ons come nested below, not as flat siblings
        orderBy: { displayOrder: "asc" },
        include: { addOns: { orderBy: { displayOrder: "asc" } } }
      }
    }
  });
  return NextResponse.json(categories);
}

const schema = z.object({ name: z.string().min(1), description: z.string().optional(), color: z.string().optional() });

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Category name is required." }, { status: 400 });

  const count = await db.pricingCategory.count({ where: { companyId: ctx.company.id } });
  const category = await db.pricingCategory.create({
    data: { companyId: ctx.company.id, name: parsed.data.name, description: parsed.data.description, color: parsed.data.color, displayOrder: count }
  });
  return NextResponse.json(category, { status: 201 });
}
