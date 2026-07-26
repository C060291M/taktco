import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  type: z.enum(["CALL", "EMAIL", "SMS", "SITE_VISIT", "APPOINTMENT", "REMINDER"]),
  dueDate: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notes: z.string().optional(),
  ownerId: z.string().nullable().optional()
});

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const dueOnly = url.searchParams.get("due") === "true";

  const followUps = await db.followUp.findMany({
    where: {
      companyId: ctx.company.id,
      status: "PENDING",
      ...(dueOnly ? { dueDate: { lte: new Date() } } : {})
    },
    include: { customer: true, lead: { include: { customer: true } }, owner: true },
    orderBy: { dueDate: "asc" }
  });
  return NextResponse.json(followUps);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid follow-up." }, { status: 400 });

  const followUp = await db.followUp.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      leadId: parsed.data.leadId,
      type: parsed.data.type,
      dueDate: new Date(parsed.data.dueDate),
      priority: parsed.data.priority || "MEDIUM",
      notes: parsed.data.notes,
      ownerId: parsed.data.ownerId || ctx.user.id
    }
  });

  return NextResponse.json(followUp, { status: 201 });
}
