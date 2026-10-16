import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";
import { accessDaysLeft, accessExpired } from "@/lib/accountAccess";
import type { AccessInfo } from "@/lib/accountAccess";

// Notice for accounts on a closed-beta or free-trial window. The two use different wording and
// different next steps: beta testers email us, trial accounts pick a plan in Billing.
// Renders nothing for paid and unrestricted accounts.
export function AccessBanner({ info }: { info: AccessInfo }) {
  if (!info.endsAt || !info.kind) return null;
  const endDate = info.endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
  const ended = accessExpired(info);
  const days = accessDaysLeft(info);

  if (info.kind === "beta") {
    if (ended) {
      return (
        <div className="px-8 py-3 text-sm border-b border-red-500/30 bg-red-500/10 text-red-200">
          Your closed beta ended on {endDate}. This account is now read-only: you can view everything, but you cannot add, edit, or send anything. To extend your beta, email{" "}
          <a href={"mailto:" + CONTACT_EMAIL} className="underline">{CONTACT_EMAIL}</a>.
        </div>
      );
    }
    if (days > 3) return null;
    return (
      <div className="px-8 py-3 text-sm border-b border-amber-500/30 bg-amber-500/10 text-amber-200">
        Your closed beta ends on {endDate} ({days} {days === 1 ? "day" : "days"} left). After that this account becomes read-only. Email{" "}
        <a href={"mailto:" + CONTACT_EMAIL} className="underline">{CONTACT_EMAIL}</a> if you want to keep going.
      </div>
    );
  }

  if (ended) {
    return (
      <div className="px-8 py-3 text-sm border-b border-red-500/30 bg-red-500/10 text-red-200">
        Your free trial ended on {endDate}. This account is now read-only: you can view everything, but you cannot add, edit, or send anything. Choose a plan in{" "}
        <Link href="/settings/billing" className="underline">Settings &rarr; Billing</Link> to keep working.
      </div>
    );
  }
  if (days > 3) return null;
  return (
    <div className="px-8 py-3 text-sm border-b border-amber-500/30 bg-amber-500/10 text-amber-200">
      Your free trial ends on {endDate} ({days} {days === 1 ? "day" : "days"} left). Choose a plan in{" "}
      <Link href="/settings/billing" className="underline">Settings &rarr; Billing</Link> to keep working without interruption.
    </div>
  );
}