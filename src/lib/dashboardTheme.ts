import type { CSSProperties } from "react";

// Turns a tenant's chosen background style + accent color into an inline style
// for the main content area. Kept as plain CSS (no extra libraries) so it stays
// cheap and themeable per-tenant.
export function dashboardBackgroundStyle(theme: string, accentColor: string): CSSProperties {
  if (theme === "gradient") {
    return {
      backgroundColor: "#0E0F11",
      backgroundImage: `radial-gradient(circle at 15% 0%, ${accentColor}22 0%, transparent 45%), radial-gradient(circle at 100% 100%, ${accentColor}14 0%, transparent 40%)`
    };
  }
  if (theme === "grid") {
    return {
      backgroundColor: "#0E0F11",
      backgroundImage: `linear-gradient(${accentColor}14 1px, transparent 1px), linear-gradient(90deg, ${accentColor}14 1px, transparent 1px)`,
      backgroundSize: "32px 32px"
    };
  }
  return { backgroundColor: "#0E0F11" };
}
