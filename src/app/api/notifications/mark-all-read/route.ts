import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.notification.updateMany({ where: { companyId: ctx.company.id, read: false }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
