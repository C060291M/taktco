import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const schema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(`reset-password:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid reset link and a password of at least 8 characters." }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const user = await db.user.findUnique({ where: { resetToken: token } });
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null }
  });

  return NextResponse.json({ ok: true });
}