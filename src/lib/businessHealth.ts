import { db } from "@/database/client";

// The real, shared computation behind both the Business Health Score display
// and the AI Business Analysis feature - extracted here so both call the
// exact same real numbers directly (in-process function call) rather than
// one API route making a fragile HTTP self-fetch to another. Every number
// here is a direct database calculation, never an AI guess - see the
// business-health API route and BusinessHealthIndicator component for how
// this gets displayed, and the business-analysis route for how AI is only
// ever asked to write prose ABOUT these real numbers, never invent its own.
export async function computeBusinessHealth(companyId: string) {
  const company = await db.company.findUnique({ where: { id: companyId } });
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    thisMonthRevenue, lastMonthRevenue,
    openInvoices, overdueInvoices,
    paidInvoicesWithDates,
    recentEstimatesWithCost,
    estimatesWonLost,
    leadsRecent,
    jobsWithTarget,
    reviews,
    overdueTasks,
    pipelineEstimates
  ] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { companyId, paidAt: { gte: lastMonthStart, lt: startOfMonth } }, _sum: { amount: true } }),
    db.invoice.findMany({ where: { companyId, status: { in: ["UNPAID", "SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] } }, select: { amount: true, status: true } }),
    db.invoice.count({ where: { companyId, status: "OVERDUE" } }),
    db.invoice.findMany({ where: { companyId, status: "PAID", issueDate: { gte: ninetyDaysAgo } }, include: { payments: { orderBy: { paidAt: "asc" }, take: 1 } } }),
    db.estimate.findMany({ where: { companyId, status: "APPROVED", createdAt: { gte: ninetyDaysAgo } }, select: { lineItems: true, totalAmount: true } }),
    db.estimate.groupBy({ by: ["status"], where: { companyId, createdAt: { gte: ninetyDaysAgo }, status: { in: ["APPROVED", "DECLINED"] } }, _count: true }),
    db.lead.groupBy({ by: ["pipelineStage"], where: { companyId, createdAt: { gte: ninetyDaysAgo } }, _count: true }),
    db.job.findMany({ where: { companyId, targetCompletionDate: { not: null, gte: ninetyDaysAgo } }, select: { targetCompletionDate: true, actualCompletionDate: true, status: true } }),
    db.review.aggregate({ where: { companyId }, _avg: { rating: true }, _count: true }),
    db.task.count({ where: { companyId, completed: false, dueDate: { lt: now } } }),
    db.estimate.aggregate({ where: { companyId, status: { in: ["SENT", "VIEWED"] } }, _sum: { totalAmount: true }, _count: true })
  ]);

  const findings: { label: string; score: number; max: number; detail: string }[] = [];
  let total = 0;

  const thisMonth = Number(thisMonthRevenue._sum.amount ?? 0);
  const lastMonth = Number(lastMonthRevenue._sum.amount ?? 0);
  let revenueScore = 7.5;
  let revenueDetail = "Not enough revenue history yet to judge a trend.";
  if (lastMonth > 0) {
    const changePercent = ((thisMonth - lastMonth) / lastMonth) * 100;
    revenueScore = Math.max(0, Math.min(15, 7.5 + changePercent / 4));
    revenueDetail = `Revenue is ${changePercent >= 0 ? "up" : "down"} ${Math.abs(changePercent).toFixed(0)}% vs last month.`;
  }
  findings.push({ label: "Revenue trend", score: Math.round(revenueScore), max: 15, detail: revenueDetail });
  total += revenueScore;

  let marginScore = 7.5;
  let marginDetail = "No cost data on recent estimates yet - add costs in the Pricing Matrix to track this.";
  const withCostData = recentEstimatesWithCost
    .map((e) => (e.lineItems as unknown as { qty: number; unitPrice: number; cost?: number }[]))
    .filter((items) => items.some((i) => i.cost !== undefined));
  if (withCostData.length > 0) {
    let revenue = 0, cost = 0;
    for (const items of withCostData) {
      for (const i of items) {
        if (i.cost !== undefined) { revenue += i.qty * i.unitPrice; cost += i.qty * i.cost; }
      }
    }
    const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const target = company?.targetMarginPercent ? Number(company.targetMarginPercent) : 20;
    marginScore = Math.max(0, Math.min(15, 7.5 + ((margin - target) / target) * 7.5));
    marginDetail = `Average margin on recent estimates with cost data: ${margin.toFixed(0)}% (target: ${target}%).`;
  }
  findings.push({ label: "Gross margin vs. target", score: Math.round(marginScore), max: 15, detail: marginDetail });
  total += marginScore;

  const openTotal = openInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const overdueTotal = openInvoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + Number(i.amount), 0);
  const overdueRatio = openTotal > 0 ? overdueTotal / openTotal : 0;
  const invoiceScore = 15 * (1 - overdueRatio);
  findings.push({ label: "Outstanding invoices", score: Math.round(invoiceScore), max: 15, detail: `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? "" : "s"} out of ${openInvoices.length} open.` });
  total += invoiceScore;

  let paymentTimeScore = 5;
  let paymentTimeDetail = "No paid invoices in the last 90 days yet.";
  if (paidInvoicesWithDates.length > 0) {
    const days = paidInvoicesWithDates
      .filter((i) => i.payments[0])
      .map((i) => (new Date(i.payments[0].paidAt).getTime() - new Date(i.issueDate).getTime()) / (24 * 60 * 60 * 1000));
    if (days.length > 0) {
      const avgDays = days.reduce((a, b) => a + b, 0) / days.length;
      const dueDays = company?.defaultInvoiceDueDays || 14;
      paymentTimeScore = Math.max(0, Math.min(10, 10 * (dueDays / Math.max(avgDays, 1))));
      paymentTimeDetail = `Customers pay in ${avgDays.toFixed(0)} days on average (your terms: ${dueDays} days).`;
    }
  }
  findings.push({ label: "Average payment time", score: Math.round(paymentTimeScore), max: 10, detail: paymentTimeDetail });
  total += paymentTimeScore;

  const approvedCount = estimatesWonLost.find((g) => g.status === "APPROVED")?._count ?? 0;
  const declinedCount = estimatesWonLost.find((g) => g.status === "DECLINED")?._count ?? 0;
  const estimateTotal = approvedCount + declinedCount;
  let winRateScore = 7.5;
  let winRateDetail = "Not enough decided estimates in the last 90 days yet.";
  if (estimateTotal > 0) {
    const winRate = (approvedCount / estimateTotal) * 100;
    winRateScore = (winRate / 100) * 15;
    winRateDetail = `${winRate.toFixed(0)}% estimate win rate (${approvedCount} of ${estimateTotal} decided estimates).`;
  }
  findings.push({ label: "Estimate win rate", score: Math.round(winRateScore), max: 15, detail: winRateDetail });
  total += winRateScore;

  const wonLeads = leadsRecent.find((g) => g.pipelineStage === "WON")?._count ?? 0;
  const totalLeadsDecided = leadsRecent.filter((g) => g.pipelineStage === "WON" || g.pipelineStage === "LOST").reduce((s, g) => s + g._count, 0);
  let conversionScore = 5;
  let conversionDetail = "Not enough decided leads in the last 90 days yet.";
  if (totalLeadsDecided > 0) {
    const rate = (wonLeads / totalLeadsDecided) * 100;
    conversionScore = (rate / 100) * 10;
    conversionDetail = `${rate.toFixed(0)}% lead conversion rate (${wonLeads} of ${totalLeadsDecided} decided leads).`;
  }
  findings.push({ label: "Lead conversion rate", score: Math.round(conversionScore), max: 10, detail: conversionDetail });
  total += conversionScore;

  let completionScore = 5;
  let completionDetail = "No projects with a target date in the last 90 days yet.";
  if (jobsWithTarget.length > 0) {
    const onTime = jobsWithTarget.filter((j) =>
      (j.status === "COMPLETE" || j.status === "CLOSED") &&
      j.actualCompletionDate &&
      j.actualCompletionDate <= (j.targetCompletionDate as Date)
    ).length;
    const rate = (onTime / jobsWithTarget.length) * 100;
    completionScore = (rate / 100) * 10;
    completionDetail = `${onTime} of ${jobsWithTarget.length} projects with a target date finished on time.`;
  }
  findings.push({ label: "Project completion rate", score: Math.round(completionScore), max: 10, detail: completionDetail });
  total += completionScore;

  let reviewScore = 5;
  let reviewDetail = "No reviews logged yet.";
  if (reviews._count > 0 && reviews._avg.rating) {
    reviewScore = (reviews._avg.rating / 5) * 10;
    reviewDetail = `Average rating: ${reviews._avg.rating.toFixed(1)}/5 across ${reviews._count} review${reviews._count === 1 ? "" : "s"}.`;
  }
  findings.push({ label: "Review rating", score: Math.round(reviewScore), max: 10, detail: reviewDetail });
  total += reviewScore;

  const score = Math.round(total);
  const label = score >= 80 ? "Strong" : score >= 60 ? "Healthy" : score >= 40 ? "Needs attention" : "Action required";

  const insights: string[] = [];
  if (overdueRatio > 0.15) insights.push(`Outstanding invoices are ${(overdueRatio * 100).toFixed(0)}% overdue - worth a follow-up pass.`);
  if (lastMonth > 0 && thisMonth < lastMonth * 0.85) insights.push(`Revenue is down ${(((lastMonth - thisMonth) / lastMonth) * 100).toFixed(0)}% vs. last month.`);
  if (overdueTasks > 0) insights.push(`${overdueTasks} task${overdueTasks === 1 ? " is" : "s are"} overdue.`);
  if (estimateTotal >= 5 && approvedCount / estimateTotal < 0.4) insights.push("Estimate win rate is below 40% over the last 90 days.");

  return {
    score, label, findings, insights,
    pipelineValue: Number(pipelineEstimates._sum.totalAmount ?? 0),
    pipelineCount: pipelineEstimates._count,
    overdueTasks
  };
}
