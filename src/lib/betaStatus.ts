// Closed-beta status helpers. Read-only enforcement works in layers:
//  1. The signed session cookie carries a betaEndsAt claim (epoch milliseconds),
//     so src/middleware.ts can block writes without a database lookup.
//  2. The dashboard layout compares that claim to the database and refreshes the
//     cookie when they differ (for example after an admin extends a beta).
//  3. Outbound email and SMS check the database directly.
export const BETA_READ_ONLY_MESSAGE =
  "Your closed beta period has ended, so this account is now read-only. You can still view everything. Contact us to extend your beta. If it was just extended, reload the page and try again.";

export function isBetaExpired(betaEndsAt: Date | null | undefined): boolean {
  return Boolean(betaEndsAt) && Date.now() >= (betaEndsAt as Date).getTime();
}

// Whole days left, rounded up; 0 or negative once it has ended.
export function betaDaysLeft(betaEndsAt: Date): number {
  return Math.ceil((betaEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// Extra claim for createSession(); empty for accounts that are not in the beta.
export function betaClaim(betaEndsAt: Date | null | undefined): { betaEndsAt?: number } {
  return betaEndsAt ? { betaEndsAt: betaEndsAt.getTime() } : {};
}