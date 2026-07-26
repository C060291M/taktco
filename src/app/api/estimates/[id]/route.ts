import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runEstimateApprovalWorkflow } from "@/lib/estimateWorkflow";

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

// Approving an estimate here also creates the Job, moves the Lead to Won, and
// drafts a starter contract automatically - see lib/estimateWorkflow.ts.
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
    await runEstimateApprovalWorkflow(estimate);
  }

  return NextResponse.json(updated);
}
