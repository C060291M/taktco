import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

const schema = z.object({
  status: z
    .enum([
      "SCHEDULED",
      "MATERIALS_ORDERED",
      "READY_TO_START",
      "IN_PROGRESS",
      "INSPECTION_REQUIRED",
      "ON_HOLD",
      "WAITING_ON_CUSTOMER",
      "WEATHER_DELAY",
      "PUNCH_LIST",
      "COMPLETE",
      "CLOSED",
      "ARCHIVED"
    ])
    .optional(),
  actualCost: z.number().nonnegative().optional(),
  assignedUserIds: z.array(z.string()).optional(),
  projectManagerId: z.string().nullable().optional(),
  projectAddress: z.string().optional(),
  targetCompletionDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  category: z.string().optional(),
  portfolioFeatured: z.boolean().optional(),
  portfolioHidden: z.boolean().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db.job.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, photos: true, estimate: true, invoices: true }
  });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id }, include: { customer: true } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const targetCompletionDate = parsed.data.targetCompletionDate;
  const startDate = parsed.data.startDate;
  const endDate = parsed.data.endDate;
  const rest = { ...parsed.data };
  delete rest.targetCompletionDate;
  delete rest.startDate;
  delete rest.endDate;

  const updated = await db.job.update({
    where: { id: job.id },
    data: {
      ...rest,
      ...(targetCompletionDate !== undefined
        ? { targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null }
        : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {})
    }
  });

  if (parsed.data.status && parsed.data.status !== job.status) {
    await notify({
      companyId: ctx.company.id,
      category: "PROJECT_STATUS_CHANGED",
      title: `${job.customer.name}'s project is now ${parsed.data.status.replace(/_/g, " ").toLowerCase()}`,
      linkUrl: `/jobs/${job.id}`
    });
    if (parsed.data.status === "IN_PROGRESS" && job.status !== "IN_PROGRESS") {
      await runTrigger(ctx.company.id, "PROJECT_STARTED", { companyId: ctx.company.id, customerId: job.customerId, jobId: job.id, trigger: "PROJECT_STARTED" });
    }
    if (parsed.data.status === "COMPLETE" && job.status !== "COMPLETE") {
      await runTrigger(ctx.company.id, "PROJECT_COMPLETED", { companyId: ctx.company.id, customerId: job.customerId, jobId: job.id, trigger: "PROJECT_COMPLETED" });
    }
  }

  return NextResponse.json(updated);
}

// Soft delete - see schema comment on Job.deletedAt. Owner/Admin only;
// nothing about the job's real history (logs, photos, punch list,
// invoices) is touched or destroyed.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can delete projects." }, { status: 403 });
  }

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.job.update({ where: { id: job.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
