import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { encryptSecret, maskSecret } from "@/lib/crypto";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.companyCommsSettings.findUnique({ where: { companyId: ctx.company.id } });
  return NextResponse.json({
    smtp: {
      connected: Boolean(settings?.smtpUser && settings?.encryptedSmtpPassword),
      provider: settings?.smtpProvider || null,
      user: settings?.smtpUser || null,
      fromName: settings?.smtpFromName || null
    },
    resend: {
      connected: Boolean(settings?.encryptedResendApiKey),
      fromAddress: settings?.resendFromAddress || null
    },
    twilio: {
      connected: Boolean(settings?.twilioAccountSid && settings?.encryptedTwilioAuthToken),
      accountSid: settings?.twilioAccountSid ? maskSecret(settings.twilioAccountSid) : null,
      fromNumber: settings?.twilioFromNumber || null
    }
  });
}

const schema = z.object({
  smtpProvider: z.enum(["GMAIL", "OUTLOOK"]).optional(),
  smtpUser: z.string().email().optional(),
  smtpPassword: z.string().optional(), // plaintext in, only ever stored encrypted (app password, not their real login)
  smtpFromName: z.string().optional(),
  resendApiKey: z.string().optional(),
  resendFromAddress: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioFromNumber: z.string().optional(),
  clearSmtp: z.boolean().optional(),
  clearResend: z.boolean().optional(),
  clearTwilio: z.boolean().optional()
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (parsed.data.clearSmtp) {
    data.smtpProvider = null; data.smtpUser = null; data.encryptedSmtpPassword = null; data.smtpFromName = null; data.smtpConnectionStatus = "untested";
  } else if (parsed.data.smtpProvider && parsed.data.smtpUser && parsed.data.smtpPassword) {
    data.smtpProvider = parsed.data.smtpProvider;
    data.smtpUser = parsed.data.smtpUser;
    data.encryptedSmtpPassword = encryptSecret(parsed.data.smtpPassword);
    data.smtpFromName = parsed.data.smtpFromName;
    data.smtpConnectionStatus = "untested";
  }

  if (parsed.data.clearResend) {
    data.encryptedResendApiKey = null; data.resendFromAddress = null; data.resendConnectionStatus = "untested";
  } else if (parsed.data.resendApiKey) {
    data.encryptedResendApiKey = encryptSecret(parsed.data.resendApiKey);
    data.resendFromAddress = parsed.data.resendFromAddress;
    data.resendConnectionStatus = "untested";
  }

  if (parsed.data.clearTwilio) {
    data.twilioAccountSid = null; data.encryptedTwilioAuthToken = null; data.twilioFromNumber = null; data.twilioConnectionStatus = "untested";
  } else if (parsed.data.twilioAccountSid && parsed.data.twilioAuthToken && parsed.data.twilioFromNumber) {
    data.twilioAccountSid = parsed.data.twilioAccountSid;
    data.encryptedTwilioAuthToken = encryptSecret(parsed.data.twilioAuthToken);
    data.twilioFromNumber = parsed.data.twilioFromNumber;
    data.twilioConnectionStatus = "untested";
  }

  await db.companyCommsSettings.upsert({
    where: { companyId: ctx.company.id },
    create: { companyId: ctx.company.id, ...data },
    update: data
  });

  return NextResponse.json({ ok: true });
}
