import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { notify } from "@/lib/notify";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { generateContractPdf } from "@/lib/generateContractPdf";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

// Public, unauthenticated by design - mirrors /api/public/estimates/[token].
// Looked up by the unguessable signingToken (cuid), never by internal id.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const contract = await db.contract.findUnique({
    where: { signingToken: params.token },
    include: { customer: true, company: true }
  });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });

  return NextResponse.json({
    id: contract.id,
    title: contract.title,
    content: contract.content,
    status: contract.status,
    signedByName: contract.signedByName,
    signedAt: contract.signedAt,
    customer: { name: contract.customer.name },
    company: {
      name: contract.company.name,
      logoUrl: contract.company.logoUrl,
      brandAccentColor: contract.company.brandAccentColor
    }
  });
}

const schema = z.object({
  action: z.enum(["sign", "decline"]),
  signedByName: z.string().min(1).optional()
});

function pdfFilenameFor(title: string) {
  return title.replace(/[^a-z0-9]+/gi, "_") + "_signed.pdf";
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const { allowed, retryAfterMs } = checkRateLimit(`sign:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (parsed.data.action === "sign" && !parsed.data.signedByName) {
    return NextResponse.json({ error: "Type your full name to sign." }, { status: 400 });
  }

  const contract = await db.contract.findUnique({ where: { signingToken: params.token }, include: { customer: true, company: true } });
  if (!contract) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (contract.status === "SIGNED" || contract.status === "DECLINED") {
    return NextResponse.json({ error: "This contract has already been responded to." }, { status: 400 });
  }

  const newStatus = parsed.data.action === "sign" ? "SIGNED" : "DECLINED";
  const updated = await db.contract.update({
    where: { id: contract.id },
    data: {
      status: newStatus,
      signedByName: newStatus === "SIGNED" ? parsed.data.signedByName : undefined,
      signedAt: newStatus === "SIGNED" ? new Date() : undefined,
      ipAddress: newStatus === "SIGNED" ? clientIp(req) : undefined
    }
  });

  await db.auditLog.create({
    data: {
      companyId: contract.companyId,
      action: `contract_${newStatus.toLowerCase()}_by_customer`,
      entityType: "contract",
      entityId: contract.id
    }
  });

  await notify({
    companyId: contract.companyId,
    category: newStatus === "SIGNED" ? "CONTRACT_SIGNED" : "CONTRACT_DECLINED",
    title: newStatus === "SIGNED"
      ? `${contract.customer.name} signed their contract`
      : `${contract.customer.name} declined their contract`,
    linkUrl: `/contracts/${contract.id}`
  });

  if (newStatus === "SIGNED") {
    try {
      const pdfBuffer = await generateContractPdf({
        companyName: contract.company.name,
        logoUrl: contract.company.logoUrl,
        accentColor: contract.company.brandAccentColor,
        timeZone: contract.company.timeZone,
        companyPhone: contract.company.businessPhone,
        companyEmail: contract.company.businessEmail,
        customerName: contract.customer.name,
        customerAddress: contract.customer.address,
        title: contract.title,
        content: contract.content,
        companySignedByName: contract.companySignedByName,
        companySignedAt: contract.companySignedAt,
        signedByName: updated.signedByName,
        signedAt: updated.signedAt,
        createdAt: contract.createdAt
      });
      const filename = pdfFilenameFor(contract.title);

      if (contract.customer.email) {
        await sendTrackedEmail({
          companyId: contract.companyId,
          customerId: contract.customerId,
          toEmail: contract.customer.email,
          subject: `${contract.title} - signed copy for your records`,
          html: brandedEmail({
            companyName: contract.company.name,
            logoUrl: contract.company.logoUrl,
            accentColor: contract.company.brandAccentColor,
            heading: "Signed - here's your copy",
            bodyHtml: `Thanks for signing ${contract.title}. A signed PDF copy is attached for your records.`
          }),
          kind: "contract_signed_confirmation",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }

      if (contract.company.businessEmail) {
        await sendTrackedEmail({
          companyId: contract.companyId,
          toEmail: contract.company.businessEmail,
          subject: `${contract.customer.name} signed: ${contract.title}`,
          html: brandedEmail({
            companyName: contract.company.name,
            logoUrl: contract.company.logoUrl,
            accentColor: contract.company.brandAccentColor,
            heading: "Contract signed",
            bodyHtml: `${contract.customer.name} just signed ${contract.title}. A copy is attached.`
          }),
          kind: "contract_signed_company_copy",
          attachments: [{ filename, content: pdfBuffer }]
        });
      }
    } catch (err) {
      console.error("Failed to generate/send signed contract PDF:", err);
    }
  }

  return NextResponse.json({ status: updated.status });
}


