import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Simple, explainable traffic light - three thresholds, real counts, no
// hidden scoring formula. "Avoid complex analytics, keep it understandable
// in seconds" per spec - so this deliberately doesn't try to be clever.
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = ctx.company.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthRevenue, lastMonthRevenue, overdueInvoices, projectsPastTarget, stalledEstimates] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { companyId, paidAt: { gte: lastMonthStart, lt: startOfMonth } }, _sum: { amount: true } }),
    db.invoice.count({ where: { companyId, status: "OVERDUE" } }),
    db.job.count({ where: { companyId, targetCompletionDate: { lt: now }, status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] } } }),
    db.estimate.count({ where: { companyId, status: { in: ["SENT", "VIEWED"] }, createdAt: { lte: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } } })
  ]);

  const thisMonth = Number(thisMonthRevenue._sum.amount ?? 0);
  const lastMonth = Number(lastMonthRevenue._sum.amount ?? 0);
  const revenueDown = lastMonth > 0 && thisMonth < lastMonth * 0.85;

  const reasons: string[] = [];
  if (overdueInvoices > 0) reasons.push(`${overdueInvoices} overdue invoice${overdueInvoices === 1 ? "" : "s"}`);
  if (projectsPastTarget > 0) reasons.push(`${projectsPastTarget} project${projectsPastTarget === 1 ? "" : "s"} behind schedule`);
  if (stalledEstimates >= 5) reasons.push(`${stalledEstimates} estimates waiting on a response`);
  if (revenueDown) reasons.push("revenue is trending down vs. last month");

  let status: "healthy" | "attention" | "action_required" = "healthy";
  if (overdueInvoices >= 3 || projectsPastTarget >= 2) status = "action_required";
  else if (reasons.length > 0) status = "attention";

  return NextResponse.json({ status, reasons });
}
