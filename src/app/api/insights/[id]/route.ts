import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const insight = await db.insight.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!insight) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.insight.update({ where: { id: insight.id }, data: { dismissed: true, dismissedAt: new Date() } });
  return NextResponse.json(updated);
}
