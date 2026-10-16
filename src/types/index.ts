// Shared types used across the app. Prisma already generates types for every
// model (import from "@prisma/client") - this file is for types that AREN'T
// database rows: session payloads, API response shapes, UI state.

export type SessionPayload = {
  userId: string;
  companyId: string;
  role: string;
  // Closed-beta end time (epoch milliseconds); present only for enrolled companies. Read by src/middleware.ts.
  betaEndsAt?: number;
  // Current access-window claims for beta and trial accounts (see src/lib/accountAccess.ts); betaEndsAt above is the legacy claim.
  accessEndsAt?: number;
  accessKind?: "beta" | "trial";
};

export type ApiError = {
  error: string;
};

export type Toast = {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
};

export const USER_ROLES = ["OWNER", "ADMIN", "SALES_REP", "FIELD_TECH"] as const;
export type UserRoleType = (typeof USER_ROLES)[number];
