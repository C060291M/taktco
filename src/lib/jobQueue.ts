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

// Processes queued jobs - called by /api/jobs-queue/process, which needs a
// real external cron trigger in production (same pattern as
// /api/automations/process-scheduled - see that route's comment).
export async function processQueuedJobs(limit = 20) {
  const jobs = await db.jobQueueItem.findMany({
    where: { status: "QUEUED", runAt: { lte: new Date() } },
    take: limit,
    orderBy: { runAt: "asc" }
  });

  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    await db.jobQueueItem.update({ where: { id: job.id }, data: { status: "RUNNING", startedAt: new Date() } });
    try {
      await runJob(job.companyId, job.type, job.payload as Record<string, unknown>);
      await db.jobQueueItem.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      completed++;
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
      failed++;
    }
  }

  return { processed: jobs.length, completed, failed };
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
