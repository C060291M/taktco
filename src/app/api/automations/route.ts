import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const actionSchema = z.object({
  type: z.enum(["SEND_EMAIL", "SEND_SMS", "CREATE_TASK", "CREATE_FOLLOWUP", "ASSIGN_EMPLOYEE", "GENERATE_AI_CONTENT", "NOTIFY_USER", "MOVE_PIPELINE_STAGE", "UPDATE_PROJECT", "DELAY"]),
  config: z.record(z.unknown()).default({})
});

const conditionSchema = z.object({
  field: z.string(),
  operator: z.enum(["eq", "gte", "lte", "neq"]),
  value: z.unknown()
});

const schema = z.object({
  name: z.string().min(1),
  trigger: z.enum([
    "LEAD_CREATED", "CUSTOMER_CREATED", "ESTIMATE_SENT", "ESTIMATE_APPROVED", "CONTRACT_SIGNED",
    "PROJECT_STARTED", "PROJECT_COMPLETED", "INVOICE_SENT", "INVOICE_PAID", "REVIEW_RECEIVED",
    "REFERRAL_RECEIVED", "WARRANTY_EXPIRING", "TASK_OVERDUE", "PROJECT_DELAYED", "INVOICE_OVERDUE"
  ]),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1)
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await db.automationWorkflow.findMany({
    where: { companyId: ctx.company.id },
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" }
  });
  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Give the workflow a name, a trigger, and at least one action." }, { status: 400 });

  const count = await db.automationWorkflow.count({ where: { companyId: ctx.company.id } });

  const workflow = await db.automationWorkflow.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      conditions: parsed.data.conditions,
      order: count,
      actions: {
        create: parsed.data.actions.map((a, i) => ({ order: i, type: a.type, config: a.config }))
      }
    },
    include: { actions: true }
  });

  return NextResponse.json(workflow, { status: 201 });
}
