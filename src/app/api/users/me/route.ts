import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional()
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const updated = await db.user.update({
    where: { id: ctx.user.id },
    data: parsed.data,
    select: { id: true, name: true, phone: true, emailNotifications: true, smsNotifications: true }
  });

  return NextResponse.json(updated);
}
