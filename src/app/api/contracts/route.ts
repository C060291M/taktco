import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z
  .object({
    customerId: z.string(),
    jobId: z.string().optional(),
    type: z.enum(["SERVICE_AGREEMENT", "CONSTRUCTION_CONTRACT", "CHANGE_ORDER", "WARRANTY", "PAYMENT_AGREEMENT", "MAINTENANCE_AGREEMENT"]),
    title: z.string().min(1),
    content: z.string().optional(),
    fileUrl: z.string().optional(),
    fileName: z.string().optional()
  })
  .refine((data) => data.content || data.fileUrl, {
    message: "Either fill in the template or upload a document."
  });

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contracts = await db.contract.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(contracts);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid contract data." }, { status: 400 });
  }

  const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const contract = await db.contract.create({
    data: {
      companyId: ctx.company.id,
      customerId: customer.id,
      jobId: parsed.data.jobId || undefined,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      fileUrl: parsed.data.fileUrl,
      fileName: parsed.data.fileName,
      status: "DRAFT"
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "created", entityType: "contract", entityId: contract.id }
  });

  return NextResponse.json(contract, { status: 201 });
}
