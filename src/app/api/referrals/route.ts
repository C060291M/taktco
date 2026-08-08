import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";
import { claimNextLeadNumber } from "@/lib/documentNumbers";

const schema = z.object({
  referringCustomerId: z.string(),
  referredName: z.string().min(1),
  referredPhone: z.string().optional(),
  referredEmail: z.string().email().optional().or(z.literal(""))
});

// Logging a referral also creates the actual new Lead - "integrate referrals
// directly into the Leads module" from the spec - so the office never has to
// separately re-enter the same person as a lead.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter at least the referred person's name." }, { status: 400 });

  const referrer = await db.customer.findFirst({ where: { id: parsed.data.referringCustomerId, companyId: ctx.company.id } });
  if (!referrer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const leadNumber = await claimNextLeadNumber(ctx.company.id);

  const newCustomer = await db.customer.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.referredName,
      phone: parsed.data.referredPhone,
      email: parsed.data.referredEmail || undefined,
      source: `Referral from ${referrer.name}`,
      leads: { create: { companyId: ctx.company.id, leadNumber, pipelineStage: "NEW_LEAD", source: `Referral from ${referrer.name}` } }
    },
    include: { leads: true }
  });

  const referral = await db.referral.create({
    data: {
      companyId: ctx.company.id,
      referringCustomerId: referrer.id,
      referredName: parsed.data.referredName,
      referredPhone: parsed.data.referredPhone,
      referredEmail: parsed.data.referredEmail || undefined,
      resultingLeadId: newCustomer.leads[0]?.id
    }
  });

  await notify({
    companyId: ctx.company.id,
    category: "REFERRAL_RECEIVED",
    title: `${referrer.name} referred ${parsed.data.referredName}`,
    linkUrl: `/customers/${referrer.id}`
  });

  await runTrigger(ctx.company.id, "REFERRAL_RECEIVED", { companyId: ctx.company.id, customerId: referrer.id, trigger: "REFERRAL_RECEIVED" });

  return NextResponse.json(referral, { status: 201 });
}



