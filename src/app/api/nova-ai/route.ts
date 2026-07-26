import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateWithGateway, InsufficientCreditsError } from "@/lib/aiGateway";

const schema = z.object({ message: z.string().min(1) });

// Gives Claude a live snapshot of the business so answers like "how much revenue
// this month" or "which customers need follow-up" are grounded in real numbers,
// not guesses. Stateless per request - no chat history is persisted or sent back,
// so each message doesn't know about earlier ones in the same conversation yet.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Say something to Nova." }, { status: 400 });

  const companyId = ctx.company.id;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthRevenue, openLeads, activeJobs, unpaidInvoices, followUpsDue, pendingEstimates, unsignedContracts, pendingReviewRequests, pendingReferrals] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.lead.count({ where: { companyId, pipelineStage: { in: ["NEW_LEAD", "CONTACTED", "ESTIMATE_SENT"] } } }),
    db.job.count({ where: { companyId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.invoice.findMany({ where: { companyId, status: { in: ["UNPAID", "OVERDUE"] } }, include: { customer: true } }),
    db.lead.findMany({ where: { companyId, nextFollowupAt: { lte: new Date() } }, include: { customer: true } }),
    db.estimate.findMany({ where: { companyId, status: { in: ["SENT", "VIEWED"] } }, include: { customer: true } }),
    db.contract.findMany({ where: { companyId, status: "SENT" }, include: { customer: true } }),
    db.reviewRequest.count({ where: { companyId, status: { in: ["SENT", "OPENED"] } } }),
    db.referral.count({ where: { companyId, status: "PENDING" } })
  ]);

  const outstandingTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  const systemPrompt = `You are TAKTCO AI, the AI business assistant inside TAKTCO for ${ctx.company.name}, a ${
    ctx.company.tradeType || "home service"
  } business. Answer using ONLY the business data below - never invent numbers. If something isn't in the data, say you don't have that information yet rather than guessing. Keep answers short and direct, like a sharp operations manager, not a chatbot.

Current business snapshot:
- Revenue this month: $${Number(monthRevenue._sum.amount ?? 0).toLocaleString()}
- Open leads in pipeline: ${openLeads}
- Active jobs: ${activeJobs}
- Outstanding invoices: ${unpaidInvoices.length} totaling $${outstandingTotal.toLocaleString()} (customers: ${
    unpaidInvoices.map((i) => i.customer.name).join(", ") || "none"
  })
- Leads needing follow-up: ${followUpsDue.length} (${followUpsDue.map((l) => l.customer.name).join(", ") || "none"})
- Estimates waiting on customer approval: ${pendingEstimates.length} (${pendingEstimates.map((e) => e.customer.name).join(", ") || "none"})
- Contracts sent but not yet signed: ${unsignedContracts.length} (${unsignedContracts.map((c) => c.customer.name).join(", ") || "none"})
- Review requests awaiting a response: ${pendingReviewRequests}
- Pending referrals not yet followed up: ${pendingReferrals}

TAKTCO AI cannot yet create or edit records on request (no write actions) - if asked to "create an estimate" or "build a contract", say that's coming soon and point to the Estimates or Contracts page, don't pretend to do it.`;

  try {
    const reply = await generateWithGateway({
      companyId: ctx.company.id,
      feature: "quick_question",
      systemPrompt,
      userPrompt: parsed.data.message
    });
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI request failed." }, { status: 502 });
  }
}
