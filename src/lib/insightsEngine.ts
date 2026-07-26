import { db } from "@/database/client";

// Generates Insight rows from explainable business rules - never a fabricated
// ML confidence score. Each rule below is the entire "why" behind an
// insight; that's exactly what the UI's "Why am I seeing this?" link shows,
// verbatim, so nothing is hidden behind a black box.
//
// Called from a cron-callable endpoint (see /api/insights/generate) - not
// real-time, since these are daily-cadence business signals, not live events
// (those go through the Notification/Automation systems instead).
export async function generateInsightsForCompany(companyId: string) {
  const now = new Date();
  let created = 0;

  // Rule: invoice due within 3 days and still unpaid.
  const soonDueInvoices = await db.invoice.findMany({
    where: {
      companyId,
      status: { in: ["UNPAID", "SENT", "VIEWED", "PARTIALLY_PAID"] },
      dueDate: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }
    },
    include: { customer: true }
  });
  for (const inv of soonDueInvoices) {
    const exists = await db.insight.findFirst({ where: { companyId, ruleKey: "invoice_due_soon", linkUrl: `/invoices/${inv.id}`, dismissed: false } });
    if (exists) continue;
    await db.insight.create({
      data: {
        companyId,
        category: "INVOICE_RISK",
        severity: "MEDIUM",
        title: `Invoice for ${inv.customer.name} is due soon`,
        body: `$${Number(inv.amount).toLocaleString()}, due ${inv.dueDate?.toLocaleDateString()}`,
        ruleKey: "invoice_due_soon",
        ruleExplanation: "This invoice is unpaid and its due date is within the next 3 days.",
        linkUrl: `/invoices/${inv.id}`,
        recommendedAction: "Send a payment reminder before it becomes overdue."
      }
    });
    created++;
  }

  // Rule: estimate sent/viewed 5+ days ago with no response - stalled.
  const stalledEstimates = await db.estimate.findMany({
    where: { companyId, status: { in: ["SENT", "VIEWED"] }, createdAt: { lte: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } },
    include: { customer: true }
  });
  for (const est of stalledEstimates) {
    const exists = await db.insight.findFirst({ where: { companyId, ruleKey: "estimate_stalled", linkUrl: `/estimates/${est.id}`, dismissed: false } });
    if (exists) continue;
    await db.insight.create({
      data: {
        companyId,
        category: "SALES_OPPORTUNITY",
        severity: "LOW",
        title: `Follow up on the estimate for ${est.customer.name}`,
        body: `$${Number(est.totalAmount).toLocaleString()}, sent ${est.createdAt.toLocaleDateString()}`,
        ruleKey: "estimate_stalled",
        ruleExplanation: "This estimate was sent or viewed 5+ days ago with no approval or decline yet.",
        linkUrl: `/estimates/${est.id}`,
        recommendedAction: "Call or text to check in before the customer moves on."
      }
    });
    created++;
  }

  // Rule: job past its target completion date and not yet complete.
  const delayedJobs = await db.job.findMany({
    where: { companyId, targetCompletionDate: { lt: now }, status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] } },
    include: { customer: true }
  });
  for (const job of delayedJobs) {
    const exists = await db.insight.findFirst({ where: { companyId, ruleKey: "project_past_target", linkUrl: `/jobs/${job.id}`, dismissed: false } });
    if (exists) continue;
    const daysLate = Math.floor((now.getTime() - job.targetCompletionDate!.getTime()) / (24 * 60 * 60 * 1000));
    await db.insight.create({
      data: {
        companyId,
        category: "PROJECT_RISK",
        severity: daysLate > 7 ? "HIGH" : "MEDIUM",
        title: `${job.customer.name}'s project is past its target date`,
        body: `${daysLate} day${daysLate === 1 ? "" : "s"} past target completion`,
        ruleKey: "project_past_target",
        ruleExplanation: "This job's target completion date has passed and its status isn't Complete, Closed, or Archived.",
        linkUrl: `/jobs/${job.id}`,
        recommendedAction: "Update the schedule or communicate a revised timeline to the customer."
      }
    });
    created++;
  }

  // Rule: customer with no contact/job/estimate activity in 6+ months - going inactive.
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const inactiveCustomers = await db.customer.findMany({
    where: {
      companyId,
      deletedAt: null,
      updatedAt: { lt: sixMonthsAgo },
      jobs: { some: { status: { in: ["COMPLETE", "CLOSED"] } } } // only flag past customers, not brand-new leads
    },
    take: 10
  });
  for (const customer of inactiveCustomers) {
    const exists = await db.insight.findFirst({ where: { companyId, ruleKey: "customer_inactive", linkUrl: `/customers/${customer.id}`, dismissed: false } });
    if (exists) continue;
    await db.insight.create({
      data: {
        companyId,
        category: "CUSTOMER_RISK",
        severity: "LOW",
        title: `${customer.name} hasn't been active in 6+ months`,
        ruleKey: "customer_inactive",
        ruleExplanation: "No update to this customer's record in over 180 days, and they've completed a job with you before.",
        linkUrl: `/customers/${customer.id}`,
        recommendedAction: "A check-in call or a seasonal promotion could win repeat business."
      }
    });
    created++;
  }

  return { created };
}
