// Billing rules for accounts that still have a closed-beta or free-trial window. Pure functions only.
//  - Subscribing while the free window has 49+ hours left: billing starts when the window would have
//    ended (Stripe's trial_end), so nobody gets a second free week and nobody is charged early.
//  - Subscribing with less time left, or after the window ended: billing starts immediately.
//    Stripe Checkout needs trial_end to be at least 48 hours away; the extra hour is a safety margin.
//  - Companies with no window (older, demo and internal accounts) keep the standard 7-day Stripe trial.
import type { AccessInfo } from "@/lib/accountAccess";

export const MIN_STRIPE_TRIAL_MS = 49 * 60 * 60 * 1000;

// AI credits a free-trial company starts with. A paid plan includes 500 to 5,000 per cycle; the
// Stripe webhook replaces this with the plan's amount once the subscription is active.
export const TRIAL_INCLUDED_CREDITS = 100;

export function stripeTrialEnd(info: AccessInfo): Date | null {
  if (!info.endsAt || !info.kind) return null;
  return info.endsAt.getTime() - Date.now() >= MIN_STRIPE_TRIAL_MS ? info.endsAt : null;
}

// One sentence for the Billing page that says when billing would start. Null for accounts with no window.
export function billingFreeNote(info: AccessInfo): string | null {
  if (!info.endsAt || !info.kind) return null;
  const label = info.kind === "beta" ? "closed beta" : "free trial";
  const date = info.endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
  const msLeft = info.endsAt.getTime() - Date.now();
  if (msLeft >= MIN_STRIPE_TRIAL_MS) return `Your ${label} runs through ${date}. If you subscribe now, billing starts then, not today.`;
  if (msLeft > 0) return `Your ${label} ends on ${date}. If you subscribe now, billing starts today.`;
  return `Your ${label} ended on ${date}. Subscribing starts billing today and restores full access.`;
}