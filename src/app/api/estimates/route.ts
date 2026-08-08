import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { claimNextEstimateNumber } from "@/lib/documentNumbers";

const lineItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative().optional() // only present when the AI matched a real Pricing Matrix item's cost - never fabricated
});

const schema = z.object({
  customerId: z.string(),
  lineItems: z.array(lineItemSchema).min(1),
  warranty: z.string().optional(),
  terms: z.string().optional(),
  aiGenerated: z.boolean().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const estimates = await db.estimate.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(estimates);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid estimate data." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const total = parsed.data.lineItems.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
  const estimateNumber = await claimNextEstimateNumber(ctx.company.id);

  const estimate = await db.estimate.create({
    data: {
      companyId: ctx.company.id,
      customerId: customer.id,
      estimateNumber,
      lineItems: parsed.data.lineItems,
      totalAmount: total,
      warranty: parsed.data.warranty,
      terms: parsed.data.terms,
      aiGenerated: parsed.data.aiGenerated || false,
      status: "DRAFT"
    }
  });

  return NextResponse.json(estimate, { status: 201 });
}
