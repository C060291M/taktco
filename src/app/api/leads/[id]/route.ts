import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await db.lead.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: {
      customer: true,
      assignedUser: true,
      leadSource: true,
      tasks: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { dueDate: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      noteEntries: { orderBy: { createdAt: "desc" }, include: { author: true } }
    }
  });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const activity = await db.auditLog.findMany({
    where: { companyId: ctx.company.id, entityType: "lead", entityId: lead.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true }
  });

  return NextResponse.json({ ...lead, activity });
}

const schema = z.object({
  notes: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  estimatedValue: z.number().nullable().optional(),
  probability: z.number().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  assignedUserId: z.string().nullable().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const lead = await db.lead.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.lead.update({
    where: { id: lead.id },
    data: {
      ...parsed.data,
      expectedCloseDate: parsed.data.expectedCloseDate !== undefined
        ? (parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null)
        : undefined
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await db.lead.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!lead) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.lead.delete({ where: { id: lead.id } });
  return NextResponse.json({ ok: true });
}
