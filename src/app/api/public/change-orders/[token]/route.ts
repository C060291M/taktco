import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { notify } from "@/lib/notify";
import { generateChangeOrderPdf } from "@/lib/generateChangeOrderPdf";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

// Public, unauthenticated by design - looked up by the unguessable
// signingToken (cuid), never by internal id. Mirrors the estimate/contract
// public approval pattern: the customer reviews and approves themselves,
// rather than office staff typing the customer's name on their behalf.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const changeOrder = await db.changeOrder.findUnique({
    where: { signingToken: params.token },
    include: { job: { include: { customer: true } }, company: true }
  });
  if (!changeOrder) return NextResponse.json({ error: "Change order not found." }, { status: 404 });

  return NextResponse.json({
    id: changeOrder.id,
    description: changeOrder.description,
    amountDelta: Number(changeOrder.amountDelta),
    status: changeOrder.status,
    signedByName: changeOrder.signedByName,
    customer: { name: changeOrder.job.customer.name },
    company: {
      name: changeOrder.company.name,
      logoUrl: changeOrder.company.logoUrl,
      brandAccentColor: changeOrder.company.brandAccentColor,
      timeZone: changeOrder.company.timeZone
    }
  });
}

const schema = z.object({
  action: z.enum(["approve", "decline"]),
  signedByName: z.string().min(1).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (parsed.data.action === "approve" && !parsed.data.signedByName) {
    return NextResponse.json({ error: "Type your name to approve." }, { status: 400 });
  }

  const changeOrder = await db.changeOrder.findUnique({
    where: { signingToken: params.token },
    include: { job: { include: { customer: true } }, company: true }
  });
  if (!changeOrder) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (changeOrder.status === "APPROVED" || changeOrder.status === "DECLINED") {
    return NextResponse.json({ error: "This change order has already been responded to." }, { status: 400 });
  }

  const newStatus = parsed.data.action === "approve" ? "APPROVED" : "DECLINED";
  const updated = await db.changeOrder.update({
    where: { id: changeOrder.id },
    data: {
      status: newStatus,
      ...(newStatus === "APPROVED" ? { signedByName: parsed.data.signedByName, signedAt: new Date() } : {})
    }
  });

  if (newStatus === "APPROVED") {
    // Same side effect the internal staff-side approval already has -
    // preserved here so it works identically regardless of which path
    // approval came through.
    await db.job.update({
      where: { id: changeOrder.jobId },
      data: { quotedCost: { increment: changeOrder.amountDelta } }
    });

    await notify({
      companyId: changeOrder.companyId,
      category: "PROJECT_STATUS_CHANGED",
      title: `${changeOrder.job.customer.name} approved a change order`,
      body: `${changeOrder.description} - ${Number(changeOrder.amountDelta) >= 0 ? "+" : ""}$${Number(changeOrder.amountDelta).toLocaleString()}`,
      linkUrl: `/jobs/${changeOrder.jobId}`
    });

    try {
      const pdfBuffer = await generateChangeOrderPdf({
        companyName: changeOrder.company.name,
        logoUrl: changeOrder.company.logoUrl,
        accentColor: changeOrder.company.brandAccentColor,
        timeZone: changeOrder.company.timeZone,
        companyPhone: changeOrder.company.businessPhone,
        companyEmail: changeOrder.company.businessEmail,
        customerName: changeOrder.job.customer.name,
        customerAddress: changeOrder.job.customer.address,
        description: changeOrder.description,
        amountDelta: Number(changeOrder.amountDelta),
        signedByName: updated.signedByName,
        signedAt: updated.signedAt,
        createdAt: changeOrder.createdAt
      });
      const filename = "change_order_approved.pdf";

      if (changeOrder.job.customer.email) {
        await sendTrackedEmail({
          companyId: changeOrder.companyId,
          customerId: changeOrder.job.customerId,
          toEmail: changeOrder.job.customer.email,
          subject: `Change order approved - ${changeOrder.company.name}`,
          html: brandedEmail({
            companyName: changeOrder.company.name,
            logoUrl: changeOrder.company.logoUrl,
            accentColor: changeOrder.company.brandAccentColor,
            heading: "Change order approved - here's your copy",
            bodyHtml: "Thank you for approving this change. A PDF copy is attached for your records."
          }),
          kind: "change_order_approved_confirmation",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }

      if (changeOrder.company.businessEmail) {
        await sendTrackedEmail({
          companyId: changeOrder.companyId,
          toEmail: changeOrder.company.businessEmail,
          subject: `${changeOrder.job.customer.name} approved a change order`,
          html: brandedEmail({
            companyName: changeOrder.company.name,
            logoUrl: changeOrder.company.logoUrl,
            accentColor: changeOrder.company.brandAccentColor,
            heading: "Change order approved",
            bodyHtml: `${changeOrder.job.customer.name} just approved a change order. A copy is attached.`
          }),
          kind: "change_order_approved_company_copy",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }
    } catch (err) {
      console.error("Failed to generate/send change order PDF:", err);
    }
  }

  return NextResponse.json(updated);
}
