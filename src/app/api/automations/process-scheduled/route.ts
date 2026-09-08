import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { executeActions } from "@/lib/automationEngine";

// Processes any AutomationScheduledAction rows whose runAt has passed - this is
// how a DELAY step resumes. Needs a real scheduled trigger in production
// (Railway cron or any external scheduler hitting this URL every few
// minutes), protected by CRON_SECRET so it can't be triggered by anyone who
// finds the URL.
//
// CONCURRENCY: each row is CLAIMED before its actions run - processedAt is
// set via updateMany guarded on `processedAt: null`, which Postgres applies
// atomically. If two cron runs overlap (a slow run still going when the next
// fires), only one can win a given row; the other's updateMany matches zero
// rows and it skips it. Without this, both runs would resume the same
// workflow and send the same customer the same email twice.
//
// Claiming happens BEFORE the actions run, not after. That means a row whose
// actions crash mid-way is not retried - a deliberate trade: for workflows
// that send real customer emails, silently double-sending is worse than
// missing one, and failures are recorded in AutomationRunLog either way.
//
// THROUGHPUT: claimed rows run in parallel batches (each is mostly waiting on
// email/SMS network calls), and the outer loop keeps draining until nothing
// is due or maxItems is reached - so a backlog shrinks instead of being
// permanently capped at one small batch per run.
const CONCURRENCY = 5;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxItems = 500;
  let processed = 0;

  while (processed < maxItems) {
    const candidates = await db.automationScheduledAction.findMany({
      where: { processedAt: null, runAt: { lte: new Date() } },
      take: Math.min(CONCURRENCY * 4, maxItems - processed),
      orderBy: { runAt: "asc" },
      select: { id: true }
    });
    if (candidates.length === 0) break;

    // Claim each candidate atomically - only rows still unprocessed are won.
    const claimedIds: string[] = [];
    for (const candidate of candidates) {
      const result = await db.automationScheduledAction.updateMany({
        where: { id: candidate.id, processedAt: null },
        data: { processedAt: new Date() }
      });
      if (result.count === 1) claimedIds.push(candidate.id);
    }
    if (claimedIds.length === 0) continue;

    const items = await db.automationScheduledAction.findMany({
      where: { id: { in: claimedIds } },
      include: { workflow: { include: { actions: { orderBy: { order: "asc" } } } } }
    });

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const slice = items.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async function (item) {
          try {
            await executeActions(item.workflowId, item.companyId, item.workflow.actions, item.fromActionIndex, item.context as never);
          } catch {
            // executeActions already writes its own AutomationRunLog entry on
            // failure - swallow here so one bad workflow can't abort the
            // whole batch and stall every other company's automations.
          }
        })
      );
      processed += slice.length;
    }
  }

  return NextResponse.json({ processed });
}