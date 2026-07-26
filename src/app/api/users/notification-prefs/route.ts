import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  categoryPrefs: z.record(z.object({ email: z.boolean().optional(), sms: z.boolean().optional() })).optional()
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });

  const updated = await db.user.update({
    where: { id: ctx.user.id },
    data: {
      ...(parsed.data.emailNotifications !== undefined ? { emailNotifications: parsed.data.emailNotifications } : {}),
      ...(parsed.data.smsNotifications !== undefined ? { smsNotifications: parsed.data.smsNotifications } : {}),
      ...(parsed.data.categoryPrefs !== undefined ? { notificationCategoryPrefs: parsed.data.categoryPrefs } : {})
    }
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
