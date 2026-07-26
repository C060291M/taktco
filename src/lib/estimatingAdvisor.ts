import { db } from "@/database/client";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

export type AdvisorFinding = { severity: "info" | "warning"; message: string };

// Real, rule-based analysis - no fabricated risk score. Every finding here is
// a concrete, explainable comparison against the company's own stated
// defaults or their own past job history, never an invented statistic.
export async function analyzeEstimate(params: {
  companyId: string;
  lineItems: LineItem[];
  totalAmount: number;
}): Promise<AdvisorFinding[]> {
  const findings: AdvisorFinding[] = [];
  const company = await db.company.findUnique({ where: { id: params.companyId } });

  // Missing labor line item - simple keyword heuristic, stated as such.
  const hasLaborLine = params.lineItems.some((li) => /labor|install|installation/i.test(li.description));
  if (!hasLaborLine && params.lineItems.length > 0) {
    findings.push({ severity: "warning", message: "No line item mentions labor or installation — double check labor cost is included, not just materials." });
  }

  // Labor pricing check against the company's own stated default rate, if set -
  // only claims what's actually computable: whether a labor line's unit price
  // is below what the company said labor should cost. NOT a true margin
  // calculation - the system doesn't track separate cost data to compute one
  // honestly, so it doesn't pretend to.
  const laborLine = params.lineItems.find((li) => /labor|install|installation/i.test(li.description));
  if (laborLine && company?.defaultLaborRate && laborLine.unit.toLowerCase().includes("hr")) {
    const rate = Number(company.defaultLaborRate);
    if (laborLine.unitPrice < rate) {
      findings.push({
        severity: "warning",
        message: `The labor line is priced at $${laborLine.unitPrice}/hr, below your default labor rate of $${rate}/hr.`
      });
    }
  } else if (!company?.defaultLaborRate) {
    findings.push({ severity: "info", message: "Set a default labor rate in Settings → Estimate Defaults to get pricing checks on future estimates." });
  }

  // Comparable past jobs - real average of the company's own approved estimates.
  const pastApproved = await db.estimate.aggregate({
    where: { companyId: params.companyId, status: "APPROVED" },
    _avg: { totalAmount: true },
    _count: true
  });
  if (pastApproved._count >= 3 && pastApproved._avg.totalAmount) {
    const avg = Number(pastApproved._avg.totalAmount);
    const diffPercent = Math.round(((params.totalAmount - avg) / avg) * 100);
    if (Math.abs(diffPercent) >= 30) {
      findings.push({
        severity: "info",
        message: `This estimate is ${diffPercent > 0 ? diffPercent : Math.abs(diffPercent)}% ${diffPercent > 0 ? "above" : "below"} your average approved estimate of $${Math.round(avg).toLocaleString()} (based on ${pastApproved._count} past jobs).`
      });
    }
  }

  return findings;
}
