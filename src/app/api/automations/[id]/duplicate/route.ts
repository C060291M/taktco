import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await db.automationWorkflow.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { actions: { orderBy: { order: "asc" } } }
  });
  if (!workflow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const count = await db.automationWorkflow.count({ where: { companyId: ctx.company.id } });
  const copy = await db.automationWorkflow.create({
    data: {
      companyId: ctx.company.id,
      name: `${workflow.name} (copy)`,
      trigger: workflow.trigger,
      conditions: workflow.conditions as never,
      enabled: false,
      order: count,
      actions: { create: workflow.actions.map((a) => ({ order: a.order, type: a.type, config: a.config as never })) }
    }
  });

  return NextResponse.json(copy, { status: 201 });
}
