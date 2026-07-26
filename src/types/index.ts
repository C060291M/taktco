// Shared types used across the app. Prisma already generates types for every
// model (import from "@prisma/client") - this file is for types that AREN'T
// database rows: session payloads, API response shapes, UI state.

export type SessionPayload = {
  userId: string;
  companyId: string;
  role: string;
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
