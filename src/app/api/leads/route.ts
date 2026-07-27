import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "APPOINTMENT_SCHEDULED",
  "ESTIMATE_REQUESTED",
  "ESTIMATE_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ARCHIVED"
] as const;

const schema = z.object({
  leadId: z.string(),
  pipelineStage: z.enum(STAGES).optional(),
  nextFollowupAt: z.string().nullable().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await db.lead.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true, assignedUser: true, leadSource: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(leads);
}

const createSchema = z.object({
  customerId: z.string(),
  source: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  estimatedValue: z.number().optional()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid lead data." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const lead = await db.lead.create({
    data: {
      companyId: ctx.company.id,
      customerId: customer.id,
      source: parsed.data.source,
      notes: parsed.data.notes,
      priority: parsed.data.priority || "MEDIUM",
      estimatedValue: parsed.data.estimatedValue
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "created", entityType: "lead", entityId: lead.id }
  });

  return NextResponse.json(lead, { status: 201 });
}

// Moves a lead to a new pipeline stage (drag-and-drop on the board) and/or sets a follow-up date
export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid lead update." }, { status: 400 });

  const lead = await db.lead.findFirst({ where: { id: parsed.data.leadId, companyId: ctx.company.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: {
      ...(parsed.data.pipelineStage ? { pipelineStage: parsed.data.pipelineStage } : {}),
      ...(parsed.data.nextFollowupAt !== undefined
        ? { nextFollowupAt: parsed.data.nextFollowupAt ? new Date(parsed.data.nextFollowupAt) : null }
        : {})
    }
  });

  if (parsed.data.pipelineStage) {
    await db.auditLog.create({
      data: { companyId: ctx.company.id, userId: ctx.user.id, action: "stage_changed", entityType: "lead", entityId: lead.id }
    });
  }

  return NextResponse.json(updated);
}
