// Paths that don't require a session. Used for documentation and by the root
// middleware.ts below. Real per-page auth enforcement stays in requireSession()
// (src/lib/auth.ts) inside each (dashboard) layout - that's tested and working.
// This file is intentionally NOT wired into a redirect decision yet: duplicating
// the auth-guard logic here without the ability to test the interaction between
// middleware-level and layout-level redirects risks a double-redirect bug. Treat
// this as the documented seam for that work, not a silent behavior change.
export const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/auth/login", "/api/auth/signup", "/estimate", "/invoice", "/api/public"];
