import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  jobId: z.string(),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedUserId: z.string().optional(),
  dueDate: z.string().optional()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Describe the issue." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: parsed.data.jobId, companyId: ctx.company.id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const item = await db.punchListItem.create({
    data: {
      companyId: ctx.company.id,
      jobId: job.id,
      description: parsed.data.description,
      priority: parsed.data.priority || "MEDIUM",
      assignedUserId: parsed.data.assignedUserId || undefined,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  return NextResponse.json(item, { status: 201 });
}
