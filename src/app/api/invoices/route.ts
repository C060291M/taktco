import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { claimNextInvoiceNumber } from "@/lib/documentNumbers";

const lineItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().nonnegative()
});

const schema = z.object({
  customerId: z.string(),
  jobId: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  amount: z.number().positive().optional(), // manual/simple mode - back-compat with the earlier flow
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await db.invoice.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
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

  const lineItemsTotal = (parsed.data.lineItems || []).reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
  const subtotal = parsed.data.amount ?? lineItemsTotal;
  const tax = parsed.data.taxAmount ?? 0;
  const discount = parsed.data.discountAmount ?? 0;
  const total = subtotal + tax - discount;
  if (total <= 0) return NextResponse.json({ error: "Invoice total must be greater than zero." }, { status: 400 });

  const invoiceNumber = await claimNextInvoiceNumber(ctx.company.id);

  const invoice = await db.invoice.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      jobId: parsed.data.jobId,
      invoiceNumber,
      amount: total,
      lineItems: parsed.data.lineItems || [],
      taxAmount: tax,
      discountAmount: discount,
      paymentTerms: parsed.data.paymentTerms,
      notes: parsed.data.notes,
      status: "UNPAID",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  return NextResponse.json(invoice, { status: 201 });
}
