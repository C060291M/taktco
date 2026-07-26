import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { executeActions } from "@/lib/automationEngine";

// Manually runs a workflow's actions against a sample customer (the most
// recently created one, or a supplied customerId) so someone can see it work
// without waiting for the real trigger to fire.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflow = await db.automationWorkflow.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { actions: { orderBy: { order: "asc" } } }
  });
  if (!workflow) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const customer = body.customerId
    ? await db.customer.findFirst({ where: { id: body.customerId, companyId: ctx.company.id } })
    : await db.customer.findFirst({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } });

  if (!customer) return NextResponse.json({ error: "Add a customer first so there's something to test against." }, { status: 400 });

  await executeActions(workflow.id, ctx.company.id, workflow.actions, 0, { companyId: ctx.company.id, customerId: customer.id, trigger: workflow.trigger });

  return NextResponse.json({ ok: true, testedAgainst: customer.name });
}
