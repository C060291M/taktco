import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  amount: z.coerce.number().positive().max(100000000),
  paidAt: z.string().optional(),
  method: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a payment amount greater than zero." }, { status: 400 });

  const js = await db.jobSubcontract.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!js) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const when = parsed.data.paidAt ? new Date(parsed.data.paidAt + "T12:00:00") : new Date();
  const pay = await db.subcontractPayment.create({
    data: {
      companyId: ctx.company.id,
      jobSubcontractId: js.id,
      amount: parsed.data.amount,
      paidAt: isNaN(when.getTime()) ? new Date() : when,
      method: parsed.data.method || null,
      note: parsed.data.note || null
    }
  });
  return NextResponse.json(pay, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing payment." }, { status: 400 });
  await db.subcontractPayment.deleteMany({ where: { id: paymentId, jobSubcontractId: params.id, companyId: ctx.company.id } });
  return NextResponse.json({ ok: true });
}