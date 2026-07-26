import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  channel: z.enum(["EMAIL", "SMS"]),
  audience: z.enum(["ALL_CUSTOMERS", "ACTIVE_LEADS", "PAST_CUSTOMERS"]).optional(),
  subject: z.string().optional(),
  message: z.string().min(1)
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await db.campaign.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Fill in a name and a message." }, { status: 400 });

  const campaign = await db.campaign.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      channel: parsed.data.channel,
      audience: parsed.data.audience || "ALL_CUSTOMERS",
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "DRAFT"
    }
  });

  return NextResponse.json(campaign, { status: 201 });
}
