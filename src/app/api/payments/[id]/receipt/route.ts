import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";

// Lets staff re-download a clean payment receipt for any past payment,
// matching what was auto-emailed at the time - useful when a customer
// loses the original email or asks for another copy.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await db.payment.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { invoice: { include: { customer: true, company: true, payments: true } } }
  });
  if (!payment) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const invoice = payment.invoice;
  const totalPaid = invoice.payments
    .filter(function (p) { return p.status === "succeeded"; })
    .reduce(function (sum, p) { return sum + Number(p.amount); }, 0);
  const remainingBalance = Math.max(0, Number(invoice.amount) - totalPaid);

  const pdfBuffer = await generateReceiptPdf({
    companyName: invoice.company.name,
    logoUrl: invoice.company.logoUrl,
    accentColor: invoice.company.brandAccentColor,
    timeZone: invoice.company.timeZone,
    companyPhone: invoice.company.businessPhone,
    companyEmail: invoice.company.businessEmail,
    customerName: invoice.customer.name,
    customerAddress: invoice.customer.address,
    invoiceNumber: invoice.invoiceNumber,
    paymentAmount: Number(payment.amount),
    paymentMethod: payment.method === "card" ? "Card" : payment.method,
    paidAt: payment.paidAt,
    remainingBalance
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"receipt.pdf\""
    }
  });
}
