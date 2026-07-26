import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  jobId: z.string(),
  date: z.string().optional(),
  weather: z.string().optional(),
  crewPresent: z.string().optional(),
  hoursWorked: z.number().optional(),
  workCompleted: z.string().optional(),
  issues: z.string().optional(),
  delays: z.string().optional(),
  safetyNotes: z.string().optional(),
  materialsDelivered: z.string().optional(),
  equipmentUsed: z.string().optional(),
  internalNotes: z.string().optional(),
  customerNotes: z.string().optional()
});

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  const logs = await db.dailyLog.findMany({
    where: { companyId: ctx.company.id, ...(jobId ? { jobId } : {}) },
    include: { author: true },
    orderBy: { date: "desc" }
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter at least what work was completed." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: parsed.data.jobId, companyId: ctx.company.id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const log = await db.dailyLog.create({
    data: {
      companyId: ctx.company.id,
      jobId: job.id,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      weather: parsed.data.weather,
      crewPresent: parsed.data.crewPresent,
      hoursWorked: parsed.data.hoursWorked,
      workCompleted: parsed.data.workCompleted,
      issues: parsed.data.issues,
      delays: parsed.data.delays,
      safetyNotes: parsed.data.safetyNotes,
      materialsDelivered: parsed.data.materialsDelivered,
      equipmentUsed: parsed.data.equipmentUsed,
      internalNotes: parsed.data.internalNotes,
      customerNotes: parsed.data.customerNotes,
      authorId: ctx.user.id
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "daily_log_added", entityType: "job", entityId: job.id }
  });

  return NextResponse.json(log, { status: 201 });
}
