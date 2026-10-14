import { betaDaysLeft, isBetaExpired } from "@/lib/betaStatus";
import { CONTACT_EMAIL } from "@/lib/contact";

// Shown to closed-beta accounts only: a heads-up in the last 3 days, and a
// read-only notice once the beta has ended. Renders nothing for everyone else.
export function BetaBanner({ betaEndsAt }: { betaEndsAt: Date | null }) {
  if (!betaEndsAt) return null;
  const endDate = betaEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });

  if (isBetaExpired(betaEndsAt)) {
    return (
      <div className="px-8 py-3 text-sm border-b border-red-500/30 bg-red-500/10 text-red-200">
        Your closed beta ended on {endDate}. This account is now read-only: you can view everything, but you cannot add, edit, or send anything. To extend your beta, email <a href={"mailto:" + CONTACT_EMAIL} className="underline">{CONTACT_EMAIL}</a>.
      </div>
    );
  }

  const days = betaDaysLeft(betaEndsAt);
  if (days > 3) return null;
  return (
    <div className="px-8 py-3 text-sm border-b border-amber-500/30 bg-amber-500/10 text-amber-200">
      Your closed beta ends on {endDate} ({days} {days === 1 ? "day" : "days"} left). After that this account becomes read-only. Email <a href={"mailto:" + CONTACT_EMAIL} className="underline">{CONTACT_EMAIL}</a> if you want to keep going.
    </div>
  );
}
