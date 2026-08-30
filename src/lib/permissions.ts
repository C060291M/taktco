// Central permission matrix for the multi-role system. OWNER and ADMIN have
// full access everywhere (their distinction is delete capability, enforced
// separately per-route in each DELETE handler). FIELD_TECH and SALES_REP are
// scoped down here - every page in a blocked section calls
// requirePermission() right after requireSession(), redirecting away rather
// than rendering anything from that section.
export type Role = "OWNER" | "ADMIN" | "SALES_REP" | "FIELD_TECH";

// Sections a Field Tech is blocked from entirely - jobs/photos/logs/schedule
// stay open since that's their whole job.
export const FIELD_TECH_BLOCKED = [
  "dashboard",
  "customers",
  "pipeline",
  "estimates",
  "contracts",
  "invoices",
  "marketing",
  "campaigns",
  "automations",
  "analytics",
  "settings"
] as const;

// Sections a Sales Rep is blocked from - pipeline/leads/estimates/contracts/
// marketing all stay open, matching their revenue-generation scope.
export const SALES_REP_BLOCKED = [
  "invoices",
  "automations",
  "settings"
] as const;

export function isBlockedFrom(role: string, section: string): boolean {
  if (role === "FIELD_TECH") return (FIELD_TECH_BLOCKED as readonly string[]).includes(section);
  if (role === "SALES_REP") return (SALES_REP_BLOCKED as readonly string[]).includes(section);
  return false;
}

// Where a blocked role should land instead - Field Techs go to their jobs
// list, Sales Reps go to the pipeline (their real home base).
export function fallbackPathFor(role: string): string {
  if (role === "FIELD_TECH") return "/jobs";
  if (role === "SALES_REP") return "/dashboard";
  return "/dashboard";
}

