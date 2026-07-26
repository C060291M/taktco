import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export type AgendaItem = {
  id: string;
  icon: string;
  label: string;
  count: number;
  linkUrl: string;
  urgent: boolean;
};

// Real counts, computed fresh - "Today's Agenda" is meant to be the first
// thing an owner sees, so nothing here can be stale or fabricated. Reuses
// the same real-data patterns as the Insights engine and Morning Briefing.
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = ctx.company.id;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [
    followUpsDue,
    invoicesDueToday,
    jobsScheduledToday,
    overdueInvoices,
    projectsPastTarget,
    newLeads,
    stalledEstimates,
    reviewReadyCustomers
  ] = await Promise.all([
    db.followUp.count({ where: { companyId, status: "PENDING", dueDate: { lte: endOfDay } } }),
    db.invoice.count({ where: { companyId, status: { in: ["UNPAID", "SENT", "VIEWED", "PARTIALLY_PAID"] }, dueDate: { gte: startOfDay, lt: endOfDay } } }),
    db.job.count({ where: { companyId, startDate: { gte: startOfDay, lt: endOfDay } } }),
    db.invoice.count({ where: { companyId, status: "OVERDUE" } }),
    db.job.count({ where: { companyId, targetCompletionDate: { lt: now }, status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] } } }),
    db.lead.count({ where: { companyId, pipelineStage: "NEW_LEAD" } }),
    db.estimate.count({ where: { companyId, status: { in: ["SENT", "VIEWED"] }, createdAt: { lte: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } } }),
    db.job.count({
      where: {
        companyId,
        status: { in: ["COMPLETE", "CLOSED"] },
        customer: { reviewRequests: { none: {} } }
      }
    })
  ]);

  const items: AgendaItem[] = [
    { id: "leads", icon: "🎯", label: "New leads waiting", count: newLeads, linkUrl: "/pipeline", urgent: newLeads > 0 },
    { id: "followups", icon: "📞", label: "Follow-ups due", count: followUpsDue, linkUrl: "/customers", urgent: followUpsDue > 0 },
    { id: "stalled", icon: "📋", label: "Estimates gone quiet", count: stalledEstimates, linkUrl: "/estimates", urgent: false },
    { id: "jobs_today", icon: "📅", label: "Jobs scheduled today", count: jobsScheduledToday, linkUrl: "/jobs", urgent: false },
    { id: "invoices_today", icon: "💰", label: "Invoices due today", count: invoicesDueToday, linkUrl: "/invoices", urgent: invoicesDueToday > 0 },
    { id: "overdue", icon: "⚠️", label: "Overdue invoices", count: overdueInvoices, linkUrl: "/invoices", urgent: overdueInvoices > 0 },
    { id: "delayed", icon: "⚠️", label: "Projects needing attention", count: projectsPastTarget, linkUrl: "/jobs", urgent: projectsPastTarget > 0 },
    { id: "reviews", icon: "⭐", label: "Completed jobs ready for a review ask", count: reviewReadyCustomers, linkUrl: "/portfolio", urgent: false }
  ].filter((item) => item.count > 0);

  return NextResponse.json({ items });
}
