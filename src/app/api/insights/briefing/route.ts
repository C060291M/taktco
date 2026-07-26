import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateWithGateway, InsufficientCreditsError } from "@/lib/aiGateway";

// Same grounded pattern as TAKTCO AI chat: every number in the briefing comes
// from a real query first, then the AI gateway only narrates those numbers
// into a paragraph - it's never asked to invent or estimate anything itself.
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = ctx.company.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonthRevenue, lastMonthRevenue, projectsBehind, invoicesNeedingAttention, followUpsDue, openLeads] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { companyId, paidAt: { gte: lastMonthStart, lt: startOfMonth } }, _sum: { amount: true } }),
    db.job.count({ where: { companyId, targetCompletionDate: { lt: now }, status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] } } }),
    db.invoice.count({ where: { companyId, status: { in: ["OVERDUE", "UNPAID", "SENT", "VIEWED"] } } }),
    db.followUp.count({ where: { companyId, status: "PENDING", dueDate: { lte: now } } }),
    db.lead.count({ where: { companyId, pipelineStage: { notIn: ["WON", "LOST"] } } })
  ]);

  const thisMonth = Number(thisMonthRevenue._sum.amount ?? 0);
  const lastMonth = Number(lastMonthRevenue._sum.amount ?? 0);
  const changePercent = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  const facts = {
    revenueThisMonth: thisMonth,
    revenueChangeVsLastMonth: changePercent,
    projectsBehindSchedule: projectsBehind,
    invoicesNeedingAttention,
    followUpsDue,
    openPipelineLeads: openLeads
  };

  let narrative = "";
  try {
    narrative = await generateWithGateway({
      companyId,
      feature: "business_analysis",
      systemPrompt: `You write a short daily business briefing for ${ctx.company.name}, a ${ctx.company.tradeType || "construction"} company. Use ONLY the numbers given - never invent or estimate anything not provided. 2-4 short sentences, direct and plain, like a sharp operations manager talking to the owner. Start with "Good morning."`,
      userPrompt: JSON.stringify(facts)
    });
  } catch (err) {
    // AI narration is a nice-to-have layer on top of real numbers - if it's
    // unavailable (no credits, not configured), the raw facts below are
    // still a complete, honest briefing on their own.
    narrative = err instanceof InsufficientCreditsError ? "" : "";
  }

  return NextResponse.json({ facts, narrative });
}
