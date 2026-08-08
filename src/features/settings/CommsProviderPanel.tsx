"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";

type CommsStatus = {
  smtp: { connected: boolean; provider: string | null; user: string | null; fromName: string | null };
  resend: { connected: boolean; fromAddress: string | null };
  twilio: { connected: boolean; accountSid: string | null; fromNumber: string | null };
};

// No platform-wide fallback anymore - every company must connect their own
// email and SMS, or sending simply doesn't happen (see resend.ts/twilio.ts).
// Gmail/Outlook via SMTP + app password is the simple, primary email path;
// Resend stays available for companies that already have their own account.
export function CommsProviderPanel() {
  const toast = useToast();
  const [status, setStatus] = useState<CommsStatus | null>(null);
  const [emailTab, setEmailTab] = useState<"gmail" | "outlook" | "resend">("gmail");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState("");
  const [saving, setSaving] = useState(false);

  function refresh() {
    fetch("/api/comms-settings").then((r) => r.json()).then(setStatus);
  }
  useEffect(refresh, []);

  async function saveSmtp(provider: "GMAIL" | "OUTLOOK") {
    if (!smtpUser.trim() || !smtpPassword.trim()) { toast.error("Enter your email and app password."); return; }
    setSaving(true);
    const res = await fetch("/api/comms-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smtpProvider: provider, smtpUser, smtpPassword, smtpFromName })
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`${provider === "GMAIL" ? "Gmail" : "Outlook"} connected - your own inbox will send all outgoing email.`);
      setSmtpUser(""); setSmtpPassword(""); setSmtpFromName("");
      refresh();
    } else toast.error("Couldn't save. Check your email and app password.");
  }

  async function clearSmtp() {
    setSaving(true);
    await fetch("/api/comms-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearSmtp: true }) });
    setSaving(false);
    toast.success("Disconnected.");
    refresh();
  }

  async function saveResend() {
    if (!resendKey.trim()) { toast.error("Enter your Resend API key first."); return; }
    setSaving(true);
    const res = await fetch("/api/comms-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resendApiKey: resendKey, resendFromAddress: resendFrom })
    });
    setSaving(false);
    if (res.ok) { toast.success("Resend connected."); setResendKey(""); refresh(); }
    else toast.error("Couldn't save. Check your API key.");
  }

  async function clearResend() {
    setSaving(true);
    await fetch("/api/comms-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearResend: true }) });
    setSaving(false);
    toast.success("Disconnected.");
    refresh();
  }

  async function saveTwilio() {
    if (!twilioSid.trim() || !twilioToken.trim() || !twilioFrom.trim()) { toast.error("Fill in all three Twilio fields."); return; }
    setSaving(true);
    const res = await fetch("/api/comms-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twilioAccountSid: twilioSid, twilioAuthToken: twilioToken, twilioFromNumber: twilioFrom })
    });
    setSaving(false);
    if (res.ok) { toast.success("Twilio connected."); setTwilioSid(""); setTwilioToken(""); setTwilioFrom(""); refresh(); }
    else toast.error("Couldn't save. Check your credentials.");
  }

  async function clearTwilio() {
    setSaving(true);
    await fetch("/api/comms-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clearTwilio: true }) });
    setSaving(false);
    toast.success("Disconnected.");
    refresh();
  }

  if (!status) return null;
  const emailConnected = status.smtp.connected || status.resend.connected;

  return (
    <div className="card p-5 space-y-6">
      <div>
        <h2 className="text-sm font-medium text-white">Email & SMS</h2>
        <p className="text-xs text-graphite-500">
          TAKTCO doesn't use a shared account for either - connect your own below. Nothing sends until you do.
        </p>
      </div>

      <div className="space-y-2 pt-2 border-t border-graphite-700">
        <p className="text-xs font-medium text-graphite-300">Email</p>
        {emailConnected ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400">
              Connected - sending from {status.smtp.connected ? status.smtp.user : status.resend.fromAddress}
              {status.smtp.connected ? ` (${status.smtp.provider === "GMAIL" ? "Gmail" : "Outlook"})` : " (Resend)"}
            </span>
            <button className="text-graphite-500 hover:text-red-400" disabled={saving} onClick={status.smtp.connected ? clearSmtp : clearResend}>Disconnect</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-1 mb-2">
              <button className={emailTab === "gmail" ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => setEmailTab("gmail")}>Gmail</button>
              <button className={emailTab === "outlook" ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => setEmailTab("outlook")}>Outlook</button>
              <button className={emailTab === "resend" ? "btn-primary text-xs" : "btn-secondary text-xs"} onClick={() => setEmailTab("resend")}>I have Resend</button>
            </div>

            {(emailTab === "gmail" || emailTab === "outlook") && (
              <div className="space-y-2">
                <p className="text-[11px] text-graphite-500">
                  You'll need an <strong>app password</strong>, not your normal login password.{" "}
                  {emailTab === "gmail"
                    ? "Turn on 2-Step Verification, then generate one at myaccount.google.com/apppasswords."
                    : "Generate one at account.microsoft.com/security under \"Advanced security options\"."}
                </p>
                <input className="input" type="email" placeholder="Your email address" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
                <input className="input" type="password" placeholder="App password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                <input className="input" placeholder="Display name (e.g. Ace Fence Co)" value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} />
                <button className="btn-secondary text-xs" disabled={saving} onClick={() => saveSmtp(emailTab === "gmail" ? "GMAIL" : "OUTLOOK")}>
                  Connect {emailTab === "gmail" ? "Gmail" : "Outlook"}
                </button>
              </div>
            )}
            {emailTab === "resend" && (
              <div className="space-y-2">
                <input className="input" placeholder="Resend API key (re_...)" value={resendKey} onChange={(e) => setResendKey(e.target.value)} />
                <input className="input" placeholder='From address, e.g. "Ace Fence Co <hello@acefence.com>"' value={resendFrom} onChange={(e) => setResendFrom(e.target.value)} />
                <button className="btn-secondary text-xs" disabled={saving} onClick={saveResend}>Connect Resend</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-graphite-700">
        <p className="text-xs font-medium text-graphite-300">SMS (Twilio)</p>
        {status.twilio.connected ? (
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400">Connected - sending from {status.twilio.fromNumber}</span>
            <button className="text-graphite-500 hover:text-red-400" disabled={saving} onClick={clearTwilio}>Disconnect</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-graphite-500">
              Requires your own Twilio account and A2P 10DLC registration (a US carrier compliance step Twilio walks
              you through) before SMS will actually deliver.
            </p>
            <input className="input" placeholder="Account SID (AC...)" value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} />
            <input className="input" type="password" placeholder="Auth token" value={twilioToken} onChange={(e) => setTwilioToken(e.target.value)} />
            <input className="input" placeholder="From number (+1XXXXXXXXXX)" value={twilioFrom} onChange={(e) => setTwilioFrom(e.target.value)} />
            <button className="btn-secondary text-xs" disabled={saving} onClick={saveTwilio}>Connect Twilio</button>
          </div>
        )}
      </div>
    </div>
  );
}
