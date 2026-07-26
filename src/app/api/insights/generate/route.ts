import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { generateInsightsForCompany } from "@/lib/insightsEngine";

// Daily cron-callable, same CRON_SECRET pattern as every other scheduled
// endpoint in the app (process-scheduled, jobs-queue/process, check-triggers).
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await db.company.findMany({ select: { id: true } });
  let totalCreated = 0;
  for (const company of companies) {
    const { created } = await generateInsightsForCompany(company.id);
    totalCreated += created;
  }

  return NextResponse.json({ companiesChecked: companies.length, insightsCreated: totalCreated });
}
