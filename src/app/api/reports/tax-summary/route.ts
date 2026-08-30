import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateTaxSummaryPdf } from "@/lib/generateTaxSummaryPdf";

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const invoices = await db.invoice.findMany({
    where: {
      companyId: ctx.company.id,
      status: "PAID",
      payments: { some: { paidAt: { gte: start, lt: end } } }
    },
    include: { customer: true, payments: true },
    orderBy: { issueDate: "asc" }
  });

  const rows = invoices.map(function (inv) {
    const relevantPayment = inv.payments.find(function (p) { return p.paidAt >= start && p.paidAt < end; }) || inv.payments[0];
    return {
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      paidAt: relevantPayment ? relevantPayment.paidAt.toLocaleDateString() : "-",
      amount: Number(inv.amount),
      taxAmount: Number(inv.taxAmount)
    };
  });

  const pdfBuffer = await generateTaxSummaryPdf({
    companyName: ctx.company.name,
    businessAddress: ctx.company.businessAddress,
    businessPhone: ctx.company.businessPhone,
    businessEmail: ctx.company.businessEmail,
    accentColor: ctx.company.brandAccentColor,
    year: year,
    invoices: rows
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"tax-summary-" + year + ".pdf\""
    }
  });
}
