import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string(),
  type: z.enum(["CALL", "TEXT", "EMAIL", "NOTE"]),
  content: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter what happened and pick a type." }, { status: 400 });

  const customer = await db.customer.findFirst({ where: { id: parsed.data.customerId, companyId: ctx.company.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const communication = await db.communication.create({
    data: {
      companyId: ctx.company.id,
      customerId: customer.id,
      userId: ctx.user.id,
      type: parsed.data.type,
      content: parsed.data.content
    }
  });

  return NextResponse.json(communication, { status: 201 });
}
