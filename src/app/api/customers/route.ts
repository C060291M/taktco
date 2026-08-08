import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";
import { claimNextLeadNumber } from "@/lib/documentNumbers";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  source: z.string().optional()
});

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const tagId = url.searchParams.get("tagId");
  const flaggedOnly = url.searchParams.get("flagged") === "true";
  const vipOnly = url.searchParams.get("vip") === "true";

  const customers = await db.customer.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(flaggedOnly ? { flagged: true } : {}),
      ...(vipOnly ? { vip: true } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    include: { leads: true, tags: { include: { tag: true } }, assignedUser: true }
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer data." }, { status: 400 });

  const leadNumber = await claimNextLeadNumber(ctx.company.id);

  const customer = await db.customer.create({
    data: {
      companyId: ctx.company.id,
      ...parsed.data,
      leads: { create: { companyId: ctx.company.id, leadNumber, pipelineStage: "NEW_LEAD", source: parsed.data.source } }
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "created", entityType: "customer", entityId: customer.id }
  });

  await notify({
    companyId: ctx.company.id,
    category: "NEW_LEAD",
    title: `New lead: ${customer.name}`,
    body: customer.source || undefined,
    linkUrl: `/customers/${customer.id}`
  });

  await runTrigger(ctx.company.id, "CUSTOMER_CREATED", { companyId: ctx.company.id, customerId: customer.id, trigger: "CUSTOMER_CREATED" });
  await runTrigger(ctx.company.id, "LEAD_CREATED", { companyId: ctx.company.id, customerId: customer.id, trigger: "LEAD_CREATED" });

  return NextResponse.json(customer, { status: 201 });
}



