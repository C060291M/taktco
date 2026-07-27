import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  brandPrimaryColor: z.string().optional(),
  brandAccentColor: z.string().optional()
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(ctx.company);
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can update branding." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid branding data." }, { status: 400 });

  const updated = await db.company.update({ where: { id: ctx.company.id }, data: parsed.data });
  return NextResponse.json(updated);
}
