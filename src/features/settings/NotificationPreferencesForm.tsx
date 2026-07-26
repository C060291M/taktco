"use client";
import { useState } from "react";
import { useToast } from "@/hooks/useToast";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "NEW_LEAD", label: "New lead" },
  { key: "ESTIMATE_APPROVED", label: "Estimate approved" },
  { key: "CONTRACT_SIGNED", label: "Contract signed" },
  { key: "INVOICE_PAID", label: "Invoice paid" },
  { key: "PROJECT_STATUS_CHANGED", label: "Project completed / status changed" },
  { key: "REVIEW_RECEIVED", label: "Review received" },
  { key: "REFERRAL_RECEIVED", label: "Referral received" }
];

type Prefs = Record<string, { email?: boolean; sms?: boolean }>;

export function NotificationPreferencesForm({
  emailNotifications,
  smsNotifications,
  categoryPrefs,
  hasPhone
}: {
  emailNotifications: boolean;
  smsNotifications: boolean;
  categoryPrefs: Prefs;
  hasPhone: boolean;
}) {
  const toast = useToast();
  const [masterEmail, setMasterEmail] = useState(emailNotifications);
  const [masterSms, setMasterSms] = useState(smsNotifications);
  const [prefs, setPrefs] = useState<Prefs>(categoryPrefs);
  const [saving, setSaving] = useState(false);

  function toggle(key: string, channel: "email" | "sms") {
    setPrefs((p) => {
      const current = p[key]?.[channel];
      const masterDefault = channel === "email" ? masterEmail : masterSms;
      const next = current === undefined ? !masterDefault : !current;
      return { ...p, [key]: { ...p[key], [channel]: next } };
    });
  }

  function isOn(key: string, channel: "email" | "sms") {
    const override = prefs[key]?.[channel];
    if (override !== undefined) return override;
    return channel === "email" ? masterEmail : masterSms;
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/users/notification-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: masterEmail, smsNotifications: masterSms, categoryPrefs: prefs })
    });
    setSaving(false);
    if (res.ok) toast.success("Notification preferences saved");
    else toast.error("Couldn't save. Try again.");
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-2">
        <h2 className="text-sm font-medium text-white mb-1">Master switches</h2>
        <label className="flex items-center justify-between text-sm text-graphite-200">
          Email notifications
          <input type="checkbox" checked={masterEmail} onChange={(e) => setMasterEmail(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-sm text-graphite-200">
          SMS notifications {!hasPhone && <span className="text-graphite-500 text-xs">(add a phone number to enable)</span>}
          <input type="checkbox" checked={masterSms} disabled={!hasPhone} onChange={(e) => setMasterSms(e.target.checked)} />
        </label>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Per-event overrides</h2>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between text-sm border-b border-graphite-700 last:border-0 pb-2 last:pb-0">
              <span className="text-graphite-200">{c.label}</span>
              <div className="flex gap-3">
                <label className="flex items-center gap-1 text-xs text-graphite-400">
                  <input type="checkbox" checked={isOn(c.key, "email")} onChange={() => toggle(c.key, "email")} /> Email
                </label>
                <label className="flex items-center gap-1 text-xs text-graphite-400">
                  <input type="checkbox" checked={isOn(c.key, "sms")} disabled={!hasPhone} onChange={() => toggle(c.key, "sms")} /> SMS
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
    </div>
  );
}
