import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { runEstimateApprovalWorkflow } from "@/lib/estimateWorkflow";
import { bumpLeadStageForCustomer } from "@/lib/leadStageAutomation";
import { notify } from "@/lib/notify";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Public, unauthenticated by design - this is the customer-facing approval link.
// Looked up by the unguessable approvalToken (cuid), never by internal id, and
// scoped to nothing else - a customer only ever sees their own estimate.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const estimate = await db.estimate.findUnique({
    where: { approvalToken: params.token },
    include: { customer: true, company: true }
  });
  if (!estimate) return NextResponse.json({ error: "Estimate not found." }, { status: 404 });

  if (!estimate.viewedAt && estimate.status === "SENT") {
    await db.estimate.update({ where: { id: estimate.id }, data: { viewedAt: new Date(), status: "VIEWED" } });
    await notify({
      companyId: estimate.companyId,
      category: "ESTIMATE_VIEWED",
      title: `${estimate.customer.name} viewed their estimate`,
      linkUrl: `/estimates/${estimate.id}`
    });
  }

  return NextResponse.json({
    id: estimate.id,
    status: estimate.status,
    totalAmount: estimate.totalAmount,
    lineItems: estimate.lineItems,
    warranty: estimate.warranty,
    terms: estimate.terms,
    createdAt: estimate.createdAt,
    customer: { name: estimate.customer.name },
    company: {
      name: estimate.company.name,
      logoUrl: estimate.company.logoUrl,
      brandAccentColor: estimate.company.brandAccentColor
    }
  });
}

const schema = z.object({ action: z.enum(["approve", "decline"]) });

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const { allowed, retryAfterMs } = checkRateLimit(`approve:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const estimate = await db.estimate.findUnique({ where: { approvalToken: params.token } });
  if (!estimate) return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  if (estimate.status === "APPROVED" || estimate.status === "DECLINED") {
    return NextResponse.json({ error: "This estimate has already been responded to." }, { status: 400 });
  }

  const newStatus = parsed.data.action === "approve" ? "APPROVED" : "DECLINED";
  const updated = await db.estimate.update({
    where: { id: estimate.id },
    data: { status: newStatus, approvedAt: newStatus === "APPROVED" ? new Date() : undefined }
  });

  if (newStatus === "APPROVED") {
    await runEstimateApprovalWorkflow(estimate);
  }
  if (newStatus === "DECLINED") {
    await bumpLeadStageForCustomer(estimate.companyId, estimate.customerId, "LOST");
  }

  await db.auditLog.create({
    data: {
      companyId: estimate.companyId,
      action: `estimate_${newStatus.toLowerCase()}_by_customer`,
      entityType: "estimate",
      entityId: estimate.id
    }
  });

  return NextResponse.json({ status: updated.status });
}


