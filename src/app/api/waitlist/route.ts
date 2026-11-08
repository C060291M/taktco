import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().max(200),
  name: z.string().max(100).optional(),
  company: z.string().max(150).optional(),
  website: z.string().optional() // hidden spam-trap field: real people never fill it
});

export async function POST(req: NextRequest) {
  try {
    const { allowed } = checkRateLimit(`waitlist:${clientIp(req)}`, 5, 10 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (parsed.data.website) return NextResponse.json({ ok: true }); // bot: pretend success, store nothing

    const email = parsed.data.email.trim().toLowerCase();
    if (!z.string().email().safeParse(email).success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const name = parsed.data.name?.trim() || null;
    const company = parsed.data.company?.trim() || null;

    // Same email twice is fine: it just keeps the original entry.
    await db.waitlistEntry.upsert({ where: { email }, update: {}, create: { email, name, company } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}