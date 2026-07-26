// Real Twilio integration for SMS.
//
// STATUS: written against Twilio's current SDK/API, never executed - no
// internet in this sandbox. Verify before trusting it:
// 1. `npm install twilio` (already in package.json)
// 2. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env
// 3. Send a test SMS to your own phone and confirm delivery before relying on this.
import twilio from "twilio";
import { db } from "@/database/client";
import { logError } from "@/lib/errorLog";

export const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
const client = twilioConfigured ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

// Same tracked-send pattern as sendTrackedEmail - always logs to SmsLog, even
// on failure or when Twilio isn't configured, so delivery status is visible
// in-product either way.
export async function sendTrackedSms(params: {
  companyId: string;
  customerId?: string;
  toPhone: string;
  body: string;
  kind: string;
}) {
  if (!twilioConfigured || !client) {
    await db.smsLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toPhone: params.toPhone,
        body: params.body,
        kind: params.kind,
        status: "FAILED",
        errorMessage: "Twilio not configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER missing)"
      }
    });
    return { sent: false, reason: "SMS isn't configured yet." };
  }

  try {
    const message = await client.messages.create({
      to: params.toPhone,
      from: process.env.TWILIO_FROM_NUMBER,
      body: params.body
    });
    await db.smsLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toPhone: params.toPhone,
        body: params.body,
        kind: params.kind,
        status: "SENT",
        twilioSid: message.sid
      }
    });
    return { sent: true };
  } catch (err) {
    await db.smsLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toPhone: params.toPhone,
        body: params.body,
        kind: params.kind,
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error"
      }
    });
    await logError({
      companyId: params.companyId,
      module: "SMS",
      severity: "LOW",
      message: `SMS send failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      recoveryAction: "Logged to SmsLog as FAILED, no retry attempted."
    });
    return { sent: false, reason: "Send failed - see SmsLog for details." };
  }
}
