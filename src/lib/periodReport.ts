import { db } from "@/database/client";

// Shared grounded-facts computation for the Monthly/Yearly Review - reused
// by both the KPI display and the AI narration, so the AI is only ever
// narrating numbers actually computed here, never inventing anything.
//
// Note: Lead has no updatedAt field, only createdAt - there's no reliable
// way to know WHEN a lead's stage changed to WON/LOST, only when it was
// created. Rather than approximate that with a misleading stand-in,
// "deals closed this period" is measured via Estimate.approvedAt instead,
// which is accurately timestamped.
export type PeriodFacts = {
  revenue: number;
  revenuePriorPeriod: number;
  jobsCompleted: number;
  estimatesApproved: number;
  avgJobValue: number;
  invoicesPaidCount: number;
};

export async function getPeriodFacts(companyId: string, start: Date, end: Date): Promise<PeriodFacts> {
  const periodLength = end.getTime() - start.getTime();
  const priorStart = new Date(start.getTime() - periodLength);
  const priorEnd = start;

  const [
    revenueResult,
    priorRevenueResult,
    jobsCompleted,
    estimatesApproved,
    paidInvoices,
    jobsWithCost
  ] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { companyId, paidAt: { gte: priorStart, lt: priorEnd } }, _sum: { amount: true } }),
    db.job.count({ where: { companyId, actualCompletionDate: { gte: start, lt: end } } }),
    db.estimate.count({ where: { companyId, status: "APPROVED", approvedAt: { gte: start, lt: end } } }),
    db.invoice.findMany({
      where: { companyId, status: "PAID", payments: { some: { paidAt: { gte: start, lt: end } } } },
      select: { id: true }
    }),
    db.job.findMany({ where: { companyId, createdAt: { gte: start, lt: end } }, select: { quotedCost: true } })
  ]);

  const avgJobValue = jobsWithCost.length > 0
    ? jobsWithCost.reduce((sum, j) => sum + Number(j.quotedCost), 0) / jobsWithCost.length
    : 0;

  return {
    revenue: Number(revenueResult._sum.amount ?? 0),
    revenuePriorPeriod: Number(priorRevenueResult._sum.amount ?? 0),
    jobsCompleted,
    estimatesApproved,
    avgJobValue,
    invoicesPaidCount: paidInvoices.length
  };
}
