import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "APPROVED", "DECLINED"])
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const estimate = await db.estimate.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, job: true }
  });
  if (!estimate) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(estimate);
}

// Approving an estimate here also creates the Job automatically -
// this is the "sales system hands off to project management" moment from the blueprint.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const estimate = await db.estimate.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!estimate) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.estimate.update({
    where: { id: estimate.id },
    data: {
      status: parsed.data.status,
      approvedAt: parsed.data.status === "APPROVED" ? new Date() : estimate.approvedAt
    }
  });

  if (parsed.data.status === "APPROVED") {
    const existingJob = await db.job.findUnique({ where: { estimateId: estimate.id } });
    if (!existingJob) {
      await db.job.create({
        data: {
          companyId: ctx.company.id,
          customerId: estimate.customerId,
          estimateId: estimate.id,
          quotedCost: estimate.totalAmount,
          status: "SCHEDULED"
        }
      });
    }
    await db.lead.updateMany({
      where: { companyId: ctx.company.id, customerId: estimate.customerId },
      data: { pipelineStage: "WON" }
    });
  }

  return NextResponse.json(updated);
}
