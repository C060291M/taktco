// Cron entrypoint. Run by a dedicated Railway service on a schedule (every 5
// minutes - Railway's minimum granularity). Each run pokes the app's
// cron-protected endpoints; the app itself does the real work.
//
// Why a script instead of Railway calling URLs directly: Railway cron runs a
// SERVICE on a schedule, it doesn't fire HTTP requests on its own. This is
// the smallest thing that turns "run something every 5 minutes" into "hit
// these endpoints".
//
// FREQUENT endpoints run on every invocation. DAILY endpoints only run when
// the current UTC hour matches their configured hour, so the same 5-minute
// service covers both cadences without a second service. The once-a-day
// guard matters most for check-triggers: running it repeatedly is safe now
// (it dedupes on existing notifications) but still wasteful.
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

// UTC hours. Central Time is UTC-5 (CDT) / UTC-6 (CST), so 12 UTC is roughly
// 6-7am Central - insights generate before the overdue sweep at 13 UTC.
const INSIGHTS_HOUR_UTC = 12;
const TRIGGERS_HOUR_UTC = 13;

const FREQUENT = [
  "/api/jobs-queue/process",
  "/api/automations/process-scheduled",
  "/api/campaigns/process-queue"
];

async function hit(path) {
  const url = `${APP_URL}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET, "Content-Type": "application/json" }
    });
    const text = await res.text();
    const ms = Date.now() - started;
    if (!res.ok) {
      console.error(`[cron] FAIL ${path} -> ${res.status} (${ms}ms) ${text.slice(0, 300)}`);
      return false;
    }
    console.log(`[cron] ok   ${path} -> ${res.status} (${ms}ms) ${text.slice(0, 300)}`);
    return true;
  } catch (err) {
    console.error(`[cron] ERROR ${path} -> ${err && err.message ? err.message : err}`);
    return false;
  }
}

// insights/generate pages through companies via ?skip= and reports nextSkip
// when more remain - keep calling until it says there are none left, so a
// large tenant list is fully covered by one daily run.
async function runInsights() {
  let skip = 0;
  for (let page = 0; page < 50; page++) {
    const url = `${APP_URL}/api/insights/generate?skip=${skip}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-cron-secret": CRON_SECRET, "Content-Type": "application/json" }
      });
      const body = await res.json().catch(function () { return null; });
      if (!res.ok || !body) {
        console.error(`[cron] FAIL /api/insights/generate?skip=${skip} -> ${res.status}`);
        return;
      }
      console.log(`[cron] ok   /api/insights/generate?skip=${skip} -> checked ${body.companiesChecked}, created ${body.insightsCreated}`);
      if (body.nextSkip === null || body.nextSkip === undefined) return;
      skip = body.nextSkip;
    } catch (err) {
      console.error(`[cron] ERROR insights -> ${err && err.message ? err.message : err}`);
      return;
    }
  }
  console.warn("[cron] insights paging hit its page cap - more companies may remain");
}

async function main() {
  if (!APP_URL) {
    console.error("[cron] APP_URL (or NEXT_PUBLIC_APP_URL) is not set - nothing to call.");
    process.exit(1);
  }
  if (!CRON_SECRET) {
    console.error("[cron] CRON_SECRET is not set - every request would be rejected 401.");
    process.exit(1);
  }

  const now = new Date();
  const hourUtc = now.getUTCHours();
  const minuteUtc = now.getUTCMinutes();
  console.log(`[cron] run start - ${now.toISOString()} (${hourUtc}:${String(minuteUtc).padStart(2, "0")} UTC)`);

  for (const path of FREQUENT) {
    await hit(path);
  }

  // Daily jobs fire only in the FIRST 5-minute window of their hour. Without
  // this the 5-minute schedule would run them ~12 times during that hour.
  // Both endpoints are safe to re-run (they dedupe), but once is the intent.
  const isFirstWindowOfHour = minuteUtc < 5;

  if (hourUtc === INSIGHTS_HOUR_UTC && isFirstWindowOfHour) {
    await runInsights();
  }
  if (hourUtc === TRIGGERS_HOUR_UTC && isFirstWindowOfHour) {
    await hit("/api/automations/check-triggers");
  }

  console.log("[cron] run complete");
}

main();