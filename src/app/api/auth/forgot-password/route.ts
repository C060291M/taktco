import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { db } from "@/database/client";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { sendPlatformSystemEmail } from "@/lib/platformEmail";
import { passwordResetEmail } from "@/emails/password-reset-email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(`forgot-password:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  // Deliberately the SAME response whether or not the email matches an
  // account - never reveal which emails exist. The actual send only
  // happens inside this if-block, but the caller can't tell either way.
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiresAt } });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const emailContent = passwordResetEmail({ name: user.name, resetUrl });
    // Best-effort, same as the welcome email - a missing reset email should
    // never surface as an error to the caller (that alone would reveal the
    // account exists).
    sendPlatformSystemEmail({ toEmail: user.email, subject: emailContent.subject, html: emailContent.html, companyId: user.companyId }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}