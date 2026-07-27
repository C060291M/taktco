import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string(),
  jobId: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await db.invoice.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true, payments: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice data." }, { status: 400 });

  const invoice = await db.invoice.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      jobId: parsed.data.jobId,
      amount: parsed.data.amount,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  return NextResponse.json(invoice, { status: 201 });
}
