import { NextRequest, NextResponse } from "next/server";
import { processQueuedJobs } from "@/lib/jobQueue";

// Same protection pattern as /api/automations/process-scheduled - needs a
// real external cron trigger in production (Railway's cron plugin or any
// scheduler hitting this URL every minute or two), guarded by CRON_SECRET.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processQueuedJobs();
  return NextResponse.json(result);
}
