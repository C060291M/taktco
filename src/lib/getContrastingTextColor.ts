// Picks readable text color (near-black or near-white) for a given
// background hex, based on relative luminance - so a button/badge using a
// company's own brand accent color as its background always has readable
// text, regardless of whether that accent color turns out to be light
// (like a pastel cyan) or dark (like a deep navy), which matters now that
// accent colors can be auto-extracted from a company's logo rather than
// always hand-picked from light presets.
export function getContrastingTextColor(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (c) { return c + c; }).join("") : clean;
  if (full.length !== 6) return "#0E0F11";
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;
  const toLinear = function (c: number) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.45 ? "#0E0F11" : "#ffffff";
}
