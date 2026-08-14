import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { runEstimateApprovalWorkflow } from "@/lib/estimateWorkflow";
import { bumpLeadStageForCustomer } from "@/lib/leadStageAutomation";
import { notify } from "@/lib/notify";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { generateEstimatePdf } from "@/lib/generateEstimatePdf";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

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
    displayMode: estimate.displayMode,
    validUntil: estimate.validUntil,
    customer: { name: estimate.customer.name },
    company: {
      name: estimate.company.name,
      logoUrl: estimate.company.logoUrl,
      brandAccentColor: estimate.company.brandAccentColor
    }
  });
}

const schema = z.object({ action: z.enum(["approve", "decline"]) });

function pdfFilenameFor(label: string) {
  return label.replace(/[^a-z0-9]+/gi, "_") + "_approved.pdf";
}

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

  const estimate = await db.estimate.findUnique({ where: { approvalToken: params.token }, include: { customer: true, company: true } });
  if (!estimate) return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  if (estimate.status === "APPROVED" || estimate.status === "DECLINED") {
    return NextResponse.json({ error: "This estimate has already been responded to." }, { status: 400 });
  }
  if (estimate.validUntil && estimate.validUntil < new Date()) {
    return NextResponse.json({ error: "This estimate has expired. Contact the company for an updated quote." }, { status: 400 });
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

  if (newStatus === "APPROVED") {
    try {
      const lineItems = estimate.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[];
      const pdfBuffer = await generateEstimatePdf({
        companyName: estimate.company.name,
        customerName: estimate.customer.name,
        estimateNumber: estimate.estimateNumber,
        totalAmount: Number(estimate.totalAmount),
        lineItems,
        warranty: estimate.warranty,
        terms: estimate.terms,
        approvedAt: updated.approvedAt
      });
      const label = estimate.estimateNumber || "estimate";
      const filename = pdfFilenameFor(label);

      if (estimate.customer.email) {
        await sendTrackedEmail({
          companyId: estimate.companyId,
          customerId: estimate.customerId,
          toEmail: estimate.customer.email,
          subject: `Your approved estimate from ${estimate.company.name}`,
          html: brandedEmail({
            companyName: estimate.company.name,
            logoUrl: estimate.company.logoUrl,
            accentColor: estimate.company.brandAccentColor,
            heading: "Approved - here's your copy",
            bodyHtml: `Thanks for approving your estimate. A PDF copy is attached for your records.`
          }),
          kind: "estimate_approved_confirmation",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }

      if (estimate.company.businessEmail) {
        await sendTrackedEmail({
          companyId: estimate.companyId,
          toEmail: estimate.company.businessEmail,
          subject: `${estimate.customer.name} approved their estimate`,
          html: brandedEmail({
            companyName: estimate.company.name,
            logoUrl: estimate.company.logoUrl,
            accentColor: estimate.company.brandAccentColor,
            heading: "Estimate approved",
            bodyHtml: `${estimate.customer.name} just approved their estimate. A copy is attached.`
          }),
          kind: "estimate_approved_company_copy",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }
    } catch (err) {
      console.error("Failed to generate/send approved estimate PDF:", err);
    }
  }

  return NextResponse.json({ status: updated.status });
}
