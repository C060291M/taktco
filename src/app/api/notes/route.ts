import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  content: z.string().min(1),
  pinned: z.boolean().optional(),
  private: z.boolean().optional()
}).refine((d) => !!d.customerId !== !!d.leadId, { message: "Provide exactly one of customerId or leadId." });

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid note." }, { status: 400 });

  if (parsed.data.customerId) {
    const c = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
    if (!c) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }
  if (parsed.data.leadId) {
    const l = await db.lead.findFirst({ where: { id: parsed.data.leadId, companyId: ctx.company.id } });
    if (!l) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const note = await db.note.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      leadId: parsed.data.leadId,
      content: parsed.data.content,
      pinned: parsed.data.pinned || false,
      private: parsed.data.private || false,
      authorId: ctx.user.id
    },
    include: { author: true }
  });

  return NextResponse.json(note, { status: 201 });
}
