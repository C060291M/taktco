// Known subdomain of the internal "TAKTCO HQ" company created by
// prisma/seed-admin.ts - excluded from every platform statistic (revenue,
// user counts, tier breakdown) so the admin's own account doesn't pollute
// the numbers about actual paying customers.
export const ADMIN_INTERNAL_SUBDOMAIN = "taktco-hq";

export const TIER_PRICES: Record<string, number> = { starter: 89, pro: 129, corporate: 179 };
