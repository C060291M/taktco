import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  title: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  ownerId: z.string().nullable().optional()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid task." }, { status: 400 });

  const task = await db.task.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      leadId: parsed.data.leadId,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      priority: parsed.data.priority || "MEDIUM",
      ownerId: parsed.data.ownerId || ctx.user.id
    },
    include: { owner: true }
  });

  return NextResponse.json(task, { status: 201 });
}
