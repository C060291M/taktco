import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const insights = await db.insight.findMany({
    where: { companyId: ctx.company.id, dismissed: false },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: 20
  });
  return NextResponse.json(insights);
}
