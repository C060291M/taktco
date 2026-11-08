import { db } from "@/database/client";

// Single source of truth for the closed-beta size. The signup route and the
// landing-page banner both read this, so they can never disagree.
export const BETA_SIGNUP_CAP = 4;

// Spots left = cap minus companies already enrolled in the beta (same rule signup uses).
export async function getBetaSpotsLeft(): Promise<number> {
  try {
    const used = await db.company.count({ where: { betaEnrolledAt: { not: null } } });
    return Math.max(0, BETA_SIGNUP_CAP - used);
  } catch {
    return 0; // if the count fails, hide the banner rather than show a wrong number
  }
}
