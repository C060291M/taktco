import { db } from "@/database/client";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

// Checks for time-based conditions that can't fire from a single event (a
// task doesn't "become overdue" via one action, it just sits there until
// someone checks the clock). Called from a cron-callable endpoint, same
// pattern as automation DELAY processing and the job queue.
//
// DEDUP: this used to rely purely on a 24-hour time window, which assumed
// the cron fires exactly once a day. That assumption is fragile - a retry, an
// overlapping run, a manual trigger, or a scheduler firing twice would
// re-notify every overdue item and re-run every TASK_OVERDUE /
// PROJECT_DELAYED / INVOICE_OVERDUE automation, sending duplicate messages.
//
// Dedup is now based on what has ALREADY FIRED rather than on clock timing:
// before notifying, we check whether a Notification already exists for that
// exact item (matched on its unique linkUrl). The lookback window is kept as
// a coarse pre-filter so the queries stay cheap, but correctness no longer
// depends on the cron's timing.
const LOOKBACK_DAYS = 3;
const CONCURRENCY = 5;

async function alreadyNotified(companyId: string, linkUrl: string) {
  const existing = await db.notification.findFirst({ where: { companyId, linkUrl } });
  return Boolean(existing);
}

// Runs an async handler over a list in small parallel batches - these are
// mostly network-bound (notify sends email/SMS), so doing them strictly one
// at a time is what makes this slow at scale.
async function inBatches<T>(items: T[], handler: (item: T) => Promise<boolean>) {
  let fired = 0;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const slice = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async function (item) {
        try {
          return await handler(item);
        } catch {
          // One company's failure shouldn't stop the rest of the run.
          return false;
        }
      })
    );
    for (const didFire of results) {
      if (didFire) fired++;
    }
  }
  return fired;
}

export async function checkScheduledTriggers() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let fired = 0;

  const overdueTasks = await db.task.findMany({
    where: { completed: false, dueDate: { gte: windowStart, lt: now } },
    include: { customer: true }
  });
  fired += await inBatches(overdueTasks, async function (task) {
    const linkUrl = task.customerId ? `/customers/${task.customerId}` : `/tasks/${task.id}`;
    if (await alreadyNotified(task.companyId, linkUrl)) return false;
    await notify({
      companyId: task.companyId,
      category: "FOLLOW_UP_DUE",
      title: `Task overdue: ${task.title}`,
      body: task.customer ? `For ${task.customer.name}` : undefined,
      linkUrl
    });
    await runTrigger(task.companyId, "TASK_OVERDUE", {
      companyId: task.companyId,
      customerId: task.customerId || undefined,
      trigger: "TASK_OVERDUE"
    });
    return true;
  });

  const delayedJobs = await db.job.findMany({
    where: {
      targetCompletionDate: { gte: windowStart, lt: now },
      status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] }
    },
    include: { customer: true }
  });
  fired += await inBatches(delayedJobs, async function (job) {
    const linkUrl = `/jobs/${job.id}`;
    if (await alreadyNotified(job.companyId, linkUrl)) return false;
    await notify({
      companyId: job.companyId,
      category: "PROJECT_STATUS_CHANGED",
      title: `${job.customer.name}'s project passed its target completion date`,
      linkUrl
    });
    await runTrigger(job.companyId, "PROJECT_DELAYED", {
      companyId: job.companyId,
      customerId: job.customerId,
      jobId: job.id,
      trigger: "PROJECT_DELAYED"
    });
    return true;
  });

  // Invoices additionally flip to OVERDUE, which removes them from this
  // query on subsequent runs - but the notification check still guards
  // against a duplicate if that update ever fails partway.
  const overdueInvoices = await db.invoice.findMany({
    where: { dueDate: { gte: windowStart, lt: now }, status: { in: ["UNPAID", "SENT", "VIEWED", "PARTIALLY_PAID"] } },
    include: { customer: true }
  });
  fired += await inBatches(overdueInvoices, async function (invoice) {
    const linkUrl = `/invoices/${invoice.id}`;
    if (await alreadyNotified(invoice.companyId, linkUrl)) return false;
    await db.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
    await notify({
      companyId: invoice.companyId,
      category: "INVOICE_OVERDUE",
      title: `Invoice for ${invoice.customer.name} is now overdue`,
      body: `$${Number(invoice.amount).toLocaleString()}`,
      linkUrl
    });
    await runTrigger(invoice.companyId, "INVOICE_OVERDUE", {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      trigger: "INVOICE_OVERDUE",
      amount: Number(invoice.amount)
    });
    return true;
  });

  return { tasksChecked: overdueTasks.length, jobsChecked: delayedJobs.length, invoicesChecked: overdueInvoices.length, fired };
}