import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { generateInsightsForCompany } from "@/lib/insightsEngine";

// Daily cron-callable, same CRON_SECRET pattern as every other scheduled
// endpoint in the app (process-scheduled, jobs-queue/process, check-triggers).
//
// SCALE: generateInsightsForCompany runs a series of rule queries per company
// (plus a dedup check per candidate row), so running it for every company
// sequentially in one request does not hold up as the tenant count grows -
// it would eventually exceed the request timeout and no company would get
// insights at all.
//
// Two changes make it safe: companies are processed in parallel batches
// rather than one-at-a-time, and each run is capped. A caller can page
// through the remaining companies with ?skip=N (the response reports
// `nextSkip` when there are more), so a very large tenant list can be
// covered by several staggered cron entries rather than one giant request.
const CONCURRENCY = 5;
const MAX_COMPANIES_PER_RUN = 100;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skipParam = req.nextUrl.searchParams.get("skip");
  const skip = skipParam ? Math.max(0, parseInt(skipParam, 10) || 0) : 0;

  const totalCompanies = await db.company.count();
  const companies = await db.company.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    skip,
    take: MAX_COMPANIES_PER_RUN
  });

  let totalCreated = 0;
  let failed = 0;

  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const slice = companies.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async function (company) {
        try {
          const { created } = await generateInsightsForCompany(company.id);
          return created;
        } catch {
          // One company's rules failing shouldn't stop every other company
          // from getting their insights for the day.
          return null;
        }
      })
    );
    for (const created of results) {
      if (created === null) failed++;
      else totalCreated += created;
    }
  }

  const nextSkip = skip + companies.length;
  const hasMore = nextSkip < totalCompanies;

  return NextResponse.json({
    companiesChecked: companies.length,
    insightsCreated: totalCreated,
    failed,
    totalCompanies,
    nextSkip: hasMore ? nextSkip : null
  });
}