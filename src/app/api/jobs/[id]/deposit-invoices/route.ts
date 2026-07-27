import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateDepositInvoicePair } from "@/lib/depositInvoices";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { deposit, finalBalance } = await generateDepositInvoicePair({ companyId: ctx.company.id, jobId: params.id });
    return NextResponse.json({ depositId: deposit.id, finalBalanceId: finalBalance.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not generate invoices." }, { status: 400 });
  }
}
