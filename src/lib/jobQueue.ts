import { db } from "@/database/client";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { logError } from "@/lib/errorLog";

// Enqueues a background job rather than running it inline - used for work
// that can tolerate a short delay and benefits from retry (email/SMS sends
// mainly). Not everything routes through this yet - see README for what
// still runs synchronously.
export async function enqueueJob(params: {
  companyId: string;
  type: "EMAIL_DELIVERY" | "SMS_DELIVERY" | "REVIEW_REQUEST" | "REFERRAL_PROCESSING" | "CAMPAIGN_SEND" | "AI_GENERATION" | "REPORT_GENERATION" | "AUTOMATION_PROCESSING";
  payload: Record<string, unknown>;
}) {
  return db.jobQueueItem.create({
    data: { companyId: params.companyId, type: params.type, payload: params.payload as never }
  });
}

// Processes queued jobs - called by /api/jobs-queue/process on a cron
// schedule.
//
// CONCURRENCY: rows are CLAIMED atomically before any work happens - each
// candidate is flipped QUEUED->RUNNING via updateMany guarded on
// `status: "QUEUED"`, which Postgres applies as a single atomic statement.
// If two cron runs overlap (a slow run still going when the next fires),
// only one of them can win a given row - the other's updateMany matches
// zero rows and it skips that job. Without this, both runs would read the
// same QUEUED rows and send the same customer email twice.
//
// THROUGHPUT: claimed jobs are run in parallel batches rather than strictly
// one-at-a-time, since almost every job is a network call (email/SMS) that
// spends its time waiting. The outer loop keeps draining until nothing is
// due or maxJobs is reached, so a backlog shrinks instead of being capped
// at one small batch per run.
const CONCURRENCY = 5;

export async function processQueuedJobs(maxJobs = 500) {
  let completed = 0;
  let failed = 0;
  let processed = 0;

  while (processed < maxJobs) {
    const candidates = await db.jobQueueItem.findMany({
      where: { status: "QUEUED", runAt: { lte: new Date() } },
      take: Math.min(CONCURRENCY * 4, maxJobs - processed),
      orderBy: { runAt: "asc" },
      select: { id: true }
    });
    if (candidates.length === 0) break;

    // Claim each candidate atomically - only rows still QUEUED are won.
    const claimedIds: string[] = [];
    for (const candidate of candidates) {
      const result = await db.jobQueueItem.updateMany({
        where: { id: candidate.id, status: "QUEUED" },
        data: { status: "RUNNING", startedAt: new Date() }
      });
      if (result.count === 1) claimedIds.push(candidate.id);
    }
    if (claimedIds.length === 0) continue;

    const jobs = await db.jobQueueItem.findMany({ where: { id: { in: claimedIds } } });

    for (let i = 0; i < jobs.length; i += CONCURRENCY) {
      const slice = jobs.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        slice.map(async function (job) {
          try {
            await runJob(job.companyId, job.type, job.payload as Record<string, unknown>);
            await db.jobQueueItem.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date() } });
            return true;
          } catch (err) {
            const attempts = job.attempts + 1;
            const failedForGood = attempts >= job.maxAttempts;
            await db.jobQueueItem.update({
              where: { id: job.id },
              data: {
                status: failedForGood ? "FAILED" : "QUEUED",
                attempts,
                lastError: err instanceof Error ? err.message : "Unknown error",
                // simple backoff: retry a few minutes later, longer each time
                runAt: failedForGood ? job.runAt : new Date(Date.now() + attempts * 5 * 60 * 1000)
              }
            });
            if (failedForGood) {
              await logError({
                companyId: job.companyId,
                module: "API",
                severity: "MEDIUM",
                message: `Background job ${job.type} failed after ${attempts} attempts: ${err instanceof Error ? err.message : "Unknown error"}`,
                recoveryAction: "Marked FAILED, no further retries."
              });
            }
            return false;
          }
        })
      );
      for (const ok of results) {
        if (ok) completed++;
        else failed++;
      }
      processed += slice.length;
    }
  }

  return { processed, completed, failed };
}

async function runJob(companyId: string, type: string, payload: Record<string, unknown>) {
  switch (type) {
    case "EMAIL_DELIVERY": {
      const result = await sendTrackedEmail({
        companyId,
        customerId: payload.customerId as string | undefined,
        toEmail: payload.toEmail as string,
        subject: payload.subject as string,
        html: payload.html as string,
        kind: (payload.kind as string) || "queued"
      });
      if (!result.sent) throw new Error(result.reason || "Email send failed");
      return;
    }
    case "SMS_DELIVERY": {
      const result = await sendTrackedSms({
        companyId,
        customerId: payload.customerId as string | undefined,
        toPhone: payload.toPhone as string,
        body: payload.body as string,
        kind: (payload.kind as string) || "queued"
      });
      if (!result.sent) throw new Error(result.reason || "SMS send failed");
      return;
    }
    default:
      // Other job types (REVIEW_REQUEST, CAMPAIGN_SEND, etc.) are enqueue-able
      // but don't have a runner yet - they still run synchronously at their
      // current call sites. This is the extension point when that changes.
      return;
  }
}
