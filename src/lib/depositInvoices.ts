import { db } from "@/database/client";

export async function generateDepositInvoicePair(params: { companyId: string; jobId: string; dueDays?: number }) {
  const [company, job] = await Promise.all([
    db.company.findUnique({ where: { id: params.companyId } }),
    db.job.findFirst({ where: { id: params.jobId, companyId: params.companyId }, include: { estimate: true, customer: true } })
  ]);

  if (!company || !job) throw new Error("Job not found.");
  if (!company.defaultDepositPercent) throw new Error("Set a default deposit % in Settings -> Invoice Defaults first.");
  if (!job.estimate) throw new Error("This job has no linked estimate to base a deposit on.");

  const total = Number(job.estimate.totalAmount);
  const depositPercent = Number(company.defaultDepositPercent);
  const depositAmount = Math.round(total * (depositPercent / 100) * 100) / 100;
  const remainingAmount = Math.round((total - depositAmount) * 100) / 100;

  const dueDays = params.dueDays ?? company.defaultInvoiceDueDays ?? 14;
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

  const invoiceCount = await db.invoice.count({ where: { companyId: params.companyId } });

  const deposit = await db.invoice.create({
    data: {
      companyId: params.companyId,
      jobId: job.id,
      customerId: job.customerId,
      invoiceNumber: `INV-${String(invoiceCount + 1).padStart(4, "0")}`,
      amount: depositAmount,
      lineItems: [{ description: `Deposit (${depositPercent}% of $${total.toLocaleString()})`, qty: 1, unit: "ea", unitPrice: depositAmount }],
      kind: "DEPOSIT",
      status: "UNPAID",
      dueDate
    }
  });

  const finalBalance = await db.invoice.create({
    data: {
      companyId: params.companyId,
      jobId: job.id,
      customerId: job.customerId,
      invoiceNumber: `INV-${String(invoiceCount + 2).padStart(4, "0")}`,
      amount: remainingAmount,
      lineItems: [{ description: `Remaining balance (after ${depositPercent}% deposit)`, qty: 1, unit: "ea", unitPrice: remainingAmount }],
      kind: "FINAL_BALANCE",
      status: "DRAFT",
      pairedInvoiceId: deposit.id,
      dueDate
    }
  });

  await db.invoice.update({ where: { id: deposit.id }, data: { pairedInvoiceId: finalBalance.id } });

  return { deposit, finalBalance };
}
