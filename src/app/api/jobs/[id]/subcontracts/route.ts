import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  subcontractorId: z.string().optional(),
  newName: z.string().trim().max(120).optional(),
  trade: z.string().trim().max(80).optional(),
  scope: z.string().trim().max(4000).optional(),
  agreedAmount: z.coerce.number().min(0).max(100000000)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the amount and subcontractor." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  let subId = parsed.data.subcontractorId;
  if (subId) {
    const existing = await db.subcontractor.findFirst({ where: { id: subId, companyId: ctx.company.id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Subcontractor not found." }, { status: 404 });
  } else {
    if (!parsed.data.newName) return NextResponse.json({ error: "Pick a subcontractor or enter a new name." }, { status: 400 });
    const created = await db.subcontractor.create({
      data: { companyId: ctx.company.id, name: parsed.data.newName, trade: parsed.data.trade || null }
    });
    subId = created.id;
  }

  const js = await db.jobSubcontract.create({
    data: { companyId: ctx.company.id, jobId: job.id, subcontractorId: subId, scope: parsed.data.scope || "", agreedAmount: parsed.data.agreedAmount }
  });
  return NextResponse.json(js, { status: 201 });
}