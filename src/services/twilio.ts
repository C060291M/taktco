// Real Twilio integration for SMS - own-connect only, no platform-wide
// fallback. Each company connects their own Twilio account in Settings ->
// Notifications, and must complete their own A2P 10DLC brand + campaign
// registration with Twilio before SMS actually delivers - that's a real US
// carrier compliance requirement, the same process this platform's own
// account went through, and it can't be shared or inherited between
// companies.
import twilio from "twilio";
import { db } from "@/database/client";
import { logError } from "@/lib/errorLog";
import { decryptSecret } from "@/lib/crypto";

async function getTwilioClientForCompany(companyId: string): Promise<{ client: ReturnType<typeof twilio>; fromNumber: string } | null> {
  const settings = await db.companyCommsSettings.findUnique({ where: { companyId } });
  if (settings?.twilioAccountSid && settings?.encryptedTwilioAuthToken && settings?.twilioFromNumber) {
    try {
      const token = decryptSecret(settings.encryptedTwilioAuthToken);
      return { client: twilio(settings.twilioAccountSid, token), fromNumber: settings.twilioFromNumber };
    } catch {
      return null;
    }
  }
  return null;
}

// Same tracked-send pattern as sendTrackedEmail - always logs to SmsLog, even
// on failure or when nothing's connected, so delivery status is visible
// in-product either way.
export async function sendTrackedSms(params: {
  companyId: string;
  customerId?: string;
  toPhone: string;
  body: string;
  kind: string;
}) {
  const resolved = await getTwilioClientForCompany(params.companyId);
  if (!resolved) {
    await db.smsLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toPhone: params.toPhone,
        body: params.body,
        kind: params.kind,
        status: "FAILED",
        errorMessage: "No Twilio account connected - connect one in Settings -> Notifications."
      }
    });
    return { sent: false, reason: "SMS isn't connected yet. Connect Twilio in Settings -> Notifications." };
  }

  try {
    const message = await resolved.client.messages.create({
      to: params.toPhone,
      from: resolved.fromNumber,
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
