import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await db.customer.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { leads: true }
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer data." }, { status: 400 });

  const customer = await db.customer.create({
    data: {
      companyId: ctx.company.id,
      ...parsed.data,
      leads: { create: { companyId: ctx.company.id, pipelineStage: "NEW_LEAD", source: parsed.data.source } }
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "created", entityType: "customer", entityId: customer.id }
  });

  return NextResponse.json(customer, { status: 201 });
}
