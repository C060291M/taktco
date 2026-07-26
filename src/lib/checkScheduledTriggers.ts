import { db } from "@/database/client";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

// Checks for time-based conditions that can't fire from a single event (a
// task doesn't "become overdue" via one action, it just sits there until
// someone checks the clock). Called from a cron-callable endpoint, same
// pattern as automation DELAY processing and the job queue.
//
// Dedup strategy: each check only looks at items that crossed their
// threshold within the last 24 hours, so a daily cron run catches everything
// once without re-firing forever on old overdue items. A company running
// this more/less often than daily should adjust the window accordingly.
export async function checkScheduledTriggers() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let fired = 0;

  const overdueTasks = await db.task.findMany({
    where: { completed: false, dueDate: { gte: windowStart, lt: now } },
    include: { customer: true }
  });
  for (const task of overdueTasks) {
    await notify({
      companyId: task.companyId,
      category: "FOLLOW_UP_DUE",
      title: `Task overdue: ${task.title}`,
      body: task.customer ? `For ${task.customer.name}` : undefined,
      linkUrl: task.customerId ? `/customers/${task.customerId}` : undefined
    });
    await runTrigger(task.companyId, "TASK_OVERDUE", {
      companyId: task.companyId,
      customerId: task.customerId || undefined,
      trigger: "TASK_OVERDUE"
    });
    fired++;
  }

  const delayedJobs = await db.job.findMany({
    where: {
      targetCompletionDate: { gte: windowStart, lt: now },
      status: { notIn: ["COMPLETE", "CLOSED", "ARCHIVED"] }
    },
    include: { customer: true }
  });
  for (const job of delayedJobs) {
    await notify({
      companyId: job.companyId,
      category: "PROJECT_STATUS_CHANGED",
      title: `${job.customer.name}'s project passed its target completion date`,
      linkUrl: `/jobs/${job.id}`
    });
    await runTrigger(job.companyId, "PROJECT_DELAYED", {
      companyId: job.companyId,
      customerId: job.customerId,
      jobId: job.id,
      trigger: "PROJECT_DELAYED"
    });
    fired++;
  }

  const overdueInvoices = await db.invoice.findMany({
    where: { dueDate: { gte: windowStart, lt: now }, status: { in: ["UNPAID", "SENT", "VIEWED", "PARTIALLY_PAID"] } },
    include: { customer: true }
  });
  for (const invoice of overdueInvoices) {
    await db.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
    await notify({
      companyId: invoice.companyId,
      category: "INVOICE_OVERDUE",
      title: `Invoice for ${invoice.customer.name} is now overdue`,
      body: `$${Number(invoice.amount).toLocaleString()}`,
      linkUrl: `/invoices/${invoice.id}`
    });
    await runTrigger(invoice.companyId, "INVOICE_OVERDUE", {
      companyId: invoice.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      trigger: "INVOICE_OVERDUE",
      amount: Number(invoice.amount)
    });
    fired++;
  }

  return { tasksChecked: overdueTasks.length, jobsChecked: delayedJobs.length, invoicesChecked: overdueInvoices.length, fired };
}
