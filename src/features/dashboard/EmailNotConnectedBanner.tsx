"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Deliberately separate from OnboardingChecklist, which has a "Hide for
// now" dismiss - this doesn't, since the real problem it's warning about
// (estimates/invoices silently not sending) is exactly the kind of thing
// someone shouldn't be able to dismiss away and forget until their first
// customer never gets their invoice.
export function EmailNotConnectedBanner() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/comms-settings")
      .then((r) => r.json())
      .then((data) => setConnected(Boolean(data?.smtp?.connected || data?.resend?.connected)));
  }, []);

  if (connected !== false) return null; // null (loading) or true (connected) - show nothing either way

  return (
    <div className="card p-4 border-amber-500/40 bg-amber-500/5 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-amber-300 font-medium">Email isn't connected yet</p>
        <p className="text-xs text-graphite-400">
          Estimates, invoices, and review requests won't reach your customers until you connect Gmail, Outlook, or Resend — takes about 2 minutes.
        </p>
      </div>
      <Link href="/settings/notifications" className="btn-secondary text-xs whitespace-nowrap">
        Connect email
      </Link>
    </div>
  );
}
