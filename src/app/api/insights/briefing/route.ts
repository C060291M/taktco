import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { askClaude } from "@/lib/ai";

// Same grounded pattern as TAKTCO AI chat: every number in the briefing comes
// from a real query first, then the AI narrates those numbers into a
// paragraph - it never invents or estimates anything itself.
//
// IMPORTANT: this uses askClaude directly (platform-paid, TAKTCO's own
// ANTHROPIC_API_KEY) rather than generateWithGateway - the briefing is a
// free system feature, not something that should ever charge a tenant's AI
// credits. It's also cached once per calendar day on Company, so it's a
// single AI call per company per day regardless of how many times the
// dashboard is loaded that day.
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

  const company = await db.company.findUnique({ where: { id: companyId }, select: { lastBriefingDate: true, lastBriefingNarrative: true, name: true, tradeType: true } });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const alreadyGeneratedToday = company?.lastBriefingDate && company.lastBriefingDate >= startOfToday;

  if (alreadyGeneratedToday && company?.lastBriefingNarrative) {
    return NextResponse.json({ facts, narrative: company.lastBriefingNarrative });
  }

  let narrative = "";
  try {
    narrative = await askClaude(
      `You write a short daily business briefing for ${ctx.company.name}, a ${ctx.company.tradeType || "construction"} company. Use ONLY the numbers given - never invent or estimate anything not provided. 2-4 short sentences, direct and plain, like a sharp operations manager talking to the owner. Do not start with a greeting - the app adds that separately based on the time the person is actually reading this.`,
      JSON.stringify(facts)
    );
    await db.company.update({ where: { id: companyId }, data: { lastBriefingDate: now, lastBriefingNarrative: narrative } });
  } catch {
    // AI narration is a nice-to-have layer on top of real numbers - if it's
    // unavailable, the raw facts are still a complete, honest briefing.
    narrative = "";
  }

  return NextResponse.json({ facts, narrative });
}

