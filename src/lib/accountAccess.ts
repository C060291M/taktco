// Single source of truth for what kind of account a company is and when its free access ends.
// Pure functions only (no database imports) so the edge middleware can use the messages.
//
//   PAID          active, trialing or past_due Stripe subscription: no end date, never read-only
//   BETA          enrolled in the closed beta (first four signups): 30-day window, then read-only
//   TRIAL         free 7-day trial (signups after the beta fills): then read-only until they subscribe
//   UNRESTRICTED  none of the above: pre-existing, demo and internal accounts
//
// Precedence: PAID, then BETA, then TRIAL. Subscribing therefore lifts any beta or trial limit,
// and a canceled subscription falls back to whatever window the company still has.
import { BETA_READ_ONLY_MESSAGE } from "@/lib/betaStatus";

export { BETA_READ_ONLY_MESSAGE };

export const TRIAL_READ_ONLY_MESSAGE =
  "Your free trial has ended, so this account is now read-only. You can still view everything. To keep working, choose a plan in Settings > Billing. If you just subscribed, reload the page and try again.";

export type AccountPhase = "PAID" | "BETA" | "TRIAL" | "UNRESTRICTED";
export type AccessKind = "beta" | "trial";

export type AccessFields = {
  subscriptionStatus?: string | null;
  betaEnrolledAt?: Date | null;
  betaEndsAt?: Date | null;
  trialEndsAt?: Date | null;
};

export type AccessInfo = { phase: AccountPhase; kind: AccessKind | null; endsAt: Date | null };

const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPaidStatus(status: string | null | undefined): boolean {
  return Boolean(status) && PAID_STATUSES.has(status as string);
}

export function accessInfo(company: AccessFields | null | undefined): AccessInfo {
  if (!company) return { phase: "UNRESTRICTED", kind: null, endsAt: null };
  if (isPaidStatus(company.subscriptionStatus)) return { phase: "PAID", kind: null, endsAt: null };
  if (company.betaEnrolledAt && company.betaEndsAt) return { phase: "BETA", kind: "beta", endsAt: company.betaEndsAt };
  if (company.trialEndsAt) return { phase: "TRIAL", kind: "trial", endsAt: company.trialEndsAt };
  return { phase: "UNRESTRICTED", kind: null, endsAt: null };
}

export function accessExpired(info: AccessInfo): boolean {
  return info.endsAt !== null && Date.now() >= info.endsAt.getTime();
}

// Whole days left, rounded up; 0 or negative once it has ended.
export function accessDaysLeft(info: AccessInfo): number {
  return info.endsAt ? Math.ceil((info.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
}

// Claims added to the session cookie so the middleware can enforce read-only without a database lookup.
export function accessClaim(company: AccessFields | null | undefined): { accessEndsAt?: number; accessKind?: AccessKind } {
  const info = accessInfo(company);
  if (info.endsAt && info.kind) return { accessEndsAt: info.endsAt.getTime(), accessKind: info.kind };
  return {};
}

export const PHASE_LABELS: Record<AccountPhase, string> = {
  PAID: "Paid subscription",
  BETA: "Closed beta",
  TRIAL: "Free trial",
  UNRESTRICTED: "Unrestricted (no beta or trial)"
};