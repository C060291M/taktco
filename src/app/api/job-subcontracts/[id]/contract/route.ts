import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { getContractTemplate } from "@/lib/contractTemplates";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role === "FIELD_TECH") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const js = await db.jobSubcontract.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { subcontractor: true, job: { include: { customer: true } } }
  });
  if (!js) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (js.contractId) return NextResponse.json({ id: js.contractId });

  const address = js.job.projectAddress || js.job.customer.address;
  const amount = "$" + Number(js.agreedAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const content = getContractTemplate("SUBCONTRACT", ctx.company.name, js.job.customer.name, address)
    .replaceAll("[SUBCONTRACTOR NAME]", () => js.subcontractor.name)
    .replaceAll("[SUB SCOPE]", () => js.scope || "[Describe the work to be performed]")
    .replaceAll("[SUB AMOUNT]", () => amount);

  const contract = await db.contract.create({
    data: {
      companyId: ctx.company.id,
      customerId: js.job.customerId,
      jobId: js.jobId,
      type: "SUBCONTRACT",
      title: "Subcontract - " + js.subcontractor.name + (js.job.jobNumber ? " - " + js.job.jobNumber : ""),
      content,
      status: "DRAFT"
    }
  });
  await db.jobSubcontract.update({ where: { id: js.id }, data: { contractId: contract.id } });
  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "created", entityType: "contract", entityId: contract.id }
  });
  return NextResponse.json({ id: contract.id }, { status: 201 });
}