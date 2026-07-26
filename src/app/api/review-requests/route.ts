import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string(),
  jobId: z.string().optional(),
  platform: z.enum(["GOOGLE", "FACEBOOK", "YELP", "CUSTOM"])
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pick a customer and platform." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const request = await db.reviewRequest.create({
    data: { companyId: ctx.company.id, customerId: customer.id, jobId: parsed.data.jobId, platform: parsed.data.platform }
  });

  return NextResponse.json(request, { status: 201 });
}
