import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  leadId: z.string(),
  pipelineStage: z.enum(["NEW_LEAD", "CONTACTED", "ESTIMATE_SENT", "WON", "LOST"])
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await db.lead.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true, assignedUser: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(leads);
}

// Moves a lead to a new pipeline stage (drag-and-drop on the board)
export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid stage update." }, { status: 400 });

  const lead = await db.lead.findFirst({ where: { id: parsed.data.leadId, companyId: ctx.company.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: { pipelineStage: parsed.data.pipelineStage }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "stage_changed", entityType: "lead", entityId: lead.id }
  });

  return NextResponse.json(updated);
}
