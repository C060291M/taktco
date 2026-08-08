import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeBusinessHealth } from "@/lib/businessHealth";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await computeBusinessHealth(ctx.company.id);
  return NextResponse.json(result);
}
