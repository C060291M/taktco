"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

type Profile = {
  name: string;
  phone: string | null;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated");
      router.refresh();
    } else {
      toast.error("Couldn't save your profile");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Name</label>
        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Phone</label>
        <input className="input" value={form.phone || ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>
      <div className="space-y-2 pt-2 border-t border-graphite-700">
        <p className="text-xs text-graphite-300 uppercase tracking-wide pt-2">Notifications</p>
        <label className="flex items-center gap-2 text-sm text-graphite-200">
          <input
            type="checkbox"
            checked={form.emailNotifications}
            onChange={(e) => setForm((f) => ({ ...f, emailNotifications: e.target.checked }))}
          />
          Email me about activity in my workspace
        </label>
        <label className="flex items-center gap-2 text-sm text-graphite-200">
          <input
            type="checkbox"
            checked={form.smsNotifications}
            onChange={(e) => setForm((f) => ({ ...f, smsNotifications: e.target.checked }))}
          />
          Text me about urgent items
        </label>
        <p className="text-[11px] text-graphite-500">
          Preferences save now; actual delivery isn't wired up yet — see README §5.
        </p>
      </div>
      <button className="btn-secondary" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
