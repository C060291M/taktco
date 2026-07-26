import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { executeActions } from "@/lib/automationEngine";

// Processes any AutomationScheduledAction rows whose runAt has passed - this is
// how a DELAY step resumes. Nothing in the app calls this automatically; it
// needs a real scheduled trigger in production (Railway's cron plugin, or any
// external cron service hitting this URL every few minutes). Protect it with
// CRON_SECRET so it can't be triggered by anyone who finds the URL.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await db.automationScheduledAction.findMany({
    where: { processedAt: null, runAt: { lte: new Date() } },
    include: { workflow: { include: { actions: { orderBy: { order: "asc" } } } } },
    take: 50
  });

  let processed = 0;
  for (const item of due) {
    await executeActions(item.workflowId, item.companyId, item.workflow.actions, item.fromActionIndex, item.context as never);
    await db.automationScheduledAction.update({ where: { id: item.id }, data: { processedAt: new Date() } });
    processed++;
  }

  return NextResponse.json({ processed });
}
