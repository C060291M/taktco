import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Convenience lookup so the invoice builder can pull a job's estimate line items
// with one click instead of retyping them - "no duplicate data entry" from the spec.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db.job.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { estimate: true, customer: true }
  });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({
    customerId: job.customerId,
    customerName: job.customer.name,
    lineItems: job.estimate?.lineItems || []
  });
}
