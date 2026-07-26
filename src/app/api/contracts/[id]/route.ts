import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

const schema = z.object({
  content: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "SIGNED", "DECLINED"]).optional(),
  signedByName: z.string().min(1).optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await db.contract.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, job: true }
  });
  if (!contract) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(contract);
}

// Handles three things: editing the fillable content, sending it, and "signing" it -
// signing is a typed-name + timestamp stub (see LegalDisclaimer) rather than a real
// e-signature provider. TODO before relying on this for anything binding: swap in a
// real e-sign integration (HelloSign/DocuSign) so signatures are actually verifiable.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const contract = await db.contract.findFirst({ where: { id: params.id, companyId: ctx.company.id }, include: { customer: true } });
  if (!contract) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (parsed.data.status === "SIGNED" && !parsed.data.signedByName) {
    return NextResponse.json({ error: "Type a name to sign." }, { status: 400 });
  }

  const updated = await db.contract.update({
    where: { id: contract.id },
    data: {
      ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.status === "SIGNED"
        ? {
            signedByName: parsed.data.signedByName,
            signedAt: new Date(),
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined
          }
        : {})
    }
  });

  if (parsed.data.status) {
    await db.auditLog.create({
      data: {
        companyId: ctx.company.id,
        userId: ctx.user.id,
        action: `contract_${parsed.data.status.toLowerCase()}`,
        entityType: "contract",
        entityId: contract.id
      }
    });
    if (parsed.data.status === "SIGNED") {
      await notify({
        companyId: ctx.company.id,
        category: "CONTRACT_SIGNED",
        title: `${contract.customer.name} signed their contract`,
        body: contract.title,
        linkUrl: `/contracts/${contract.id}`
      });
      await runTrigger(ctx.company.id, "CONTRACT_SIGNED", { companyId: ctx.company.id, customerId: contract.customerId, trigger: "CONTRACT_SIGNED" });
    }
  }

  return NextResponse.json(updated);
}
