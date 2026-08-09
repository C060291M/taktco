import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  defaultMarkupPercent: z.number().nullable().optional(),
  defaultLaborRate: z.number().nullable().optional(),
  defaultWarrantyText: z.string().nullable().optional(),
  defaultEstimateTerms: z.string().nullable().optional(),
  defaultInvoiceDueDays: z.number().int().nullable().optional(),
  defaultLateFeePercent: z.number().nullable().optional(),
  defaultDepositPercent: z.number().nullable().optional(),
  invoiceFooterText: z.string().nullable().optional(),
  brandVoice: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  googleReviewLink: z.string().nullable().optional(),
  sidebarStyle: z.enum(["expanded", "compact", "icons_only"]).optional(),
  minJobPrice: z.number().nullable().optional(),
  targetMarginPercent: z.number().nullable().optional(),
  mobilizationFee: z.number().nullable().optional(),
  fuelCharge: z.number().nullable().optional(),
  travelCharge: z.number().nullable().optional(),
  warrantyLengthMonths: z.number().int().nullable().optional(),
  estimateExpirationEnabled: z.boolean().optional(),
  defaultEstimateValidDays: z.number().int().min(1).optional()
});

// One shared route for every "company default" setting (estimates, invoices,
// marketing, appearance) rather than a separate endpoint per section - they're
// all the same shape of operation (partial update to Company), just different
// field subsets.
export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can change company defaults." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });

  const updated = await db.company.update({ where: { id: ctx.company.id }, data: parsed.data });
  return NextResponse.json(updated);
}

