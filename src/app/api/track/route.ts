import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Only these paths are ever recorded - anything else is ignored, so this
// endpoint can't be used to stuff arbitrary strings into the table.
const TRACKED_PATHS = new Set(["/"]);

// Crawlers, scanners, link-preview fetchers, and scripted clients. Real
// browsers (including in-app browsers) don't match this.
const BOT_PATTERN = /bot|crawl|spider|slurp|curl|wget|python|java\/|go-http|httpclient|headless|phantom|preview|monitor|uptime|facebookexternalhit|embedly|whatsapp|telegram|discord|slack/i;

const schema = z.object({
  path: z.string().max(200),
  referrer: z.string().nullish(),
  utmSource: z.string().nullish()
});

// Stores only the referring site's hostname, never the full URL - a full
// referrer can carry paths or query strings with personal data in them.
function referrerHost(raw: string | null | undefined, ownHost: string | null): string | null {
  if (!raw) return null;
  try {
    const host = new URL(raw.slice(0, 500)).hostname.toLowerCase().replace(/^www\./, "");
    if (!host) return null;
    if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, "").split(":")[0]) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Always answer 204 - tracking is best-effort and must never surface an
  // error (or reveal anything) to the visitor's browser.
  const done = new NextResponse(null, { status: 204 });

  try {
    const ua = req.headers.get("user-agent") || "";
    if (!ua || BOT_PATTERN.test(ua)) return done;

    const ip = clientIp(req);
    const { allowed } = checkRateLimit(`track:${ip}`, 30, 60 * 1000);
    if (!allowed) return done;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success || !TRACKED_PATHS.has(parsed.data.path)) return done;

    // Daily-rotating, secret-salted hash: counts unique visitors per day
    // without storing the IP, and can't be matched across days or reversed
    // by hashing a list of known IPs (the salt never leaves the server).
    const day = new Date().toISOString().slice(0, 10);
    const salt = process.env.AUTH_SECRET || "dev-only-salt";
    const visitorHash = crypto.createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);

    const utm = (parsed.data.utmSource || "").slice(0, 200).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 50) || null;

    await db.pageView.create({
      data: {
        path: parsed.data.path,
        referrer: referrerHost(parsed.data.referrer, req.headers.get("host")),
        utmSource: utm,
        visitorHash
      }
    });
  } catch {
    // Swallowed on purpose - see above.
  }
  return done;
}