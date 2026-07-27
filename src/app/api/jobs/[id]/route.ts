import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETE"]).optional(),
  actualCost: z.number().nonnegative().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db.job.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, photos: true, estimate: true, invoices: true }
  });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.job.update({ where: { id: job.id }, data: parsed.data });
  return NextResponse.json(updated);
}
