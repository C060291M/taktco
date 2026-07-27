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

  const { targetCompletionDate, ...rest } = parsed.data;
  const updated = await db.job.update({
    where: { id: job.id },
    data: {
      ...rest,
      ...(targetCompletionDate !== undefined
        ? { targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null }
        : {})
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
