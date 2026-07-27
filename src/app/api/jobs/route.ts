import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await db.job.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true, photos: true },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(jobs);
}
