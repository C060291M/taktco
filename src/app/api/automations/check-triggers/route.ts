import { NextRequest, NextResponse } from "next/server";
import { checkScheduledTriggers } from "@/lib/checkScheduledTriggers";

// Same CRON_SECRET protection as process-scheduled and jobs-queue/process -
// run this daily via an external scheduler in production.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkScheduledTriggers();
  return NextResponse.json(result);
}
