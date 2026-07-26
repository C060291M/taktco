import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  jobId: z.string(),
  description: z.string().min(1),
  amountDelta: z.number()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a description and amount." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: parsed.data.jobId, companyId: ctx.company.id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const changeOrder = await db.changeOrder.create({
    data: {
      companyId: ctx.company.id,
      jobId: job.id,
      description: parsed.data.description,
      amountDelta: parsed.data.amountDelta,
      status: "DRAFT"
    }
  });

  return NextResponse.json(changeOrder, { status: 201 });
}
