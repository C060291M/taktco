// Generates a downloadable, modern marketing flyer for a single job -
// dark background, bold headline, before/after photo pair, a feature-value
// grid with simple icon badges, a CTA band, and an icon-based contact
// footer. All content is either real job/company data or generic,
// trade-agnostic marketing copy - nothing company-specific is invented.
import { Document, Page, Text, View, Image, StyleSheet, Svg, Path, Circle, Rect, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (c) { return c + c; }).join("") : clean;
  const r = Math.max(0, Math.round(parseInt(full.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(full.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(full.substring(4, 6), 16) * (1 - amount)));
  return "#" + [r, g, b].map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
}

function IconBadge(params: { accent: string; children: React.ReactNode; size?: number }) {
  const size = params.size || 44;
  return React.createElement(
    View,
    { style: { width: size, height: size, borderRadius: size / 2, border: `1.5pt solid ${params.accent}`, alignItems: "center", justifyContent: "center", alignSelf: "center" } },
    React.createElement(
      Svg,
      { width: size * 0.5, height: size * 0.5, viewBox: "0 0 24 24" },
      params.children
    )
  );
}

const ICONS = {
  shield: React.createElement(Path, { d: "M12 2 L20 6 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V6 Z M9 12 L11 14 L15 9", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  tools: React.createElement(Path, { d: "M4 20 L14 10 M17 3 L21 7 L18 10 L14 6 Z M3 21 L7 17", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  lock: React.createElement(Path, { d: "M6 11 H18 V21 H6 Z M8 11 V7 A4 4 0 0 1 16 7 V11", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  house: React.createElement(Path, { d: "M4 11 L12 4 L20 11 M6 10 V20 H18 V10", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  calendar: React.createElement(Path, { d: "M4 6 H20 V21 H4 Z M4 10 H20 M8 3 V7 M16 3 V7 M8 14 L10 16 L15 11", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  phone: React.createElement(Path, { d: "M5 4 L9 4 L11 9 L8 11 C9 14 10 15 13 16 L15 13 L20 15 L20 19 C20 20 19 21 18 21 C10 21 3 14 3 6 C3 5 4 4 5 4 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  mail: React.createElement(Path, { d: "M4 6 H20 V18 H4 Z M4 6 L12 13 L20 6", fill: "none", stroke: "currentColor", strokeWidth: 1.6 }),
  pin: React.createElement(Path, { d: "M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2 Z M12 12 A3 3 0 1 0 12 6 A3 3 0 0 0 12 12 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.6 })
};

export async function generateFlyerPdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  serviceArea?: string | null;
  tradeType?: string | null;
  headline: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  singlePhotoUrl?: string | null;
}) {
  const accent = params.accentColor || "#1EAEC4";
  const deep = darken(accent, 0.25);
  const trade = params.tradeType || "construction";

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", backgroundColor: "#0e1116" },
    content: { padding: 28 },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 26 },
    logo: { width: 44, height: 44, objectFit: "contain", marginRight: 12 },
    companyName: { color: "#ffffff", fontSize: 15, fontWeight: 700 },
    tagline: { color: accent, fontSize: 9, marginTop: 2 },
    dividerV: { width: 1, height: 40, backgroundColor: "#2a2f38", marginHorizontal: 18 },
    eyebrow: { color: accent, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 3 },
    headerSub: { color: "#c4cad4", fontSize: 9, lineHeight: 1.4 },
    headlineWhite: { color: "#ffffff", fontSize: 26, fontWeight: 700, textAlign: "center", lineHeight: 1.15 },
    headlineAccent: { color: accent, fontSize: 26, fontWeight: 700, textAlign: "center", lineHeight: 1.15 },
    subText: { color: "#9aa4b2", fontSize: 10, textAlign: "center", marginTop: 10, marginBottom: 18 },
    photoLabelRow: { flexDirection: "row" },
    photoLabelBefore: { flex: 1, textAlign: "center", backgroundColor: "#20242c", color: "#ffffff", fontSize: 9, fontWeight: 700, paddingVertical: 6, letterSpacing: 1 },
    photoLabelAfter: { flex: 1, textAlign: "center", backgroundColor: accent, color: "#0e1116", fontSize: 9, fontWeight: 700, paddingVertical: 6, letterSpacing: 1 },
    photoRow: { flexDirection: "row", border: `1pt solid ${accent}` },
    halfPhoto: { width: "50%", height: 230, objectFit: "cover" },
    featureGrid: { flexDirection: "row", marginTop: 22, borderTop: "1pt solid #262b34", paddingTop: 18 },
    featureCol: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
    featureLabel: { color: "#ffffff", fontSize: 8.5, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 3 },
    featureDesc: { color: "#8891a0", fontSize: 7.5, textAlign: "center", lineHeight: 1.3 },
    ctaBand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, backgroundColor: "#161a21", padding: 16, borderRadius: 4 },
    ctaLeft: { flexDirection: "row", alignItems: "center" },
    ctaHeading: { color: "#ffffff", fontSize: 12, fontWeight: 700 },
    ctaHeadingAccent: { color: accent, fontSize: 12, fontWeight: 700 },
    ctaSub: { color: "#8891a0", fontSize: 8.5, marginTop: 2 },
    ctaButton: { backgroundColor: accent, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 3 },
    ctaButtonText: { color: "#0e1116", fontSize: 9.5, fontWeight: 700 },
    footer: { flexDirection: "row", justifyContent: "space-around", marginTop: 20, paddingTop: 16, borderTop: "1pt solid #262b34" },
    footerItem: { flexDirection: "row", alignItems: "center" },
    footerIconBox: { width: 26, height: 26, borderRadius: 13, border: `1pt solid ${accent}`, alignItems: "center", justifyContent: "center", marginRight: 6 },
    footerText: { color: "#ffffff", fontSize: 8.5, fontWeight: 700 },
    footerSub: { color: "#6b7280", fontSize: 7 },
    footerTagline: { color: accent, fontSize: 9, fontWeight: 700, textAlign: "center", marginTop: 16, letterSpacing: 1 }
  });

  const hasBeforeAfter = params.beforePhotoUrl && params.afterPhotoUrl;
  const heroPhoto = params.singlePhotoUrl || params.afterPhotoUrl || params.beforePhotoUrl;

  const featureItems = [
    { icon: ICONS.shield, label: "QUALITY MATERIALS", desc: "Built for durability and lasting results." },
    { icon: ICONS.tools, label: "EXPERT CRAFTSMANSHIP", desc: "Precision work by experienced professionals." },
    { icon: ICONS.house, label: "BOOSTS PROPERTY VALUE", desc: "Work that elevates the whole property." },
    { icon: ICONS.lock, label: "BUILT TO LAST", desc: "Quality that stands the test of time." }
  ];

  function footerIcon(icon: React.ReactNode) {
    return React.createElement(
      View,
      { style: styles.footerIconBox },
      React.createElement(Svg, { width: 13, height: 13, viewBox: "0 0 24 24", style: { color: accent } }, icon)
    );
  }

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(
        View,
        { style: styles.content },

        React.createElement(
          View,
          { style: styles.headerRow },
          params.logoUrl ? React.createElement(Image, { src: params.logoUrl, style: styles.logo }) : null,
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.companyName }, params.companyName),
            React.createElement(Text, { style: styles.tagline }, "Real work. Real results.")
          ),
          React.createElement(View, { style: styles.dividerV }),
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.eyebrow }, "PROJECT SPOTLIGHT"),
            React.createElement(Text, { style: styles.headerSub }, "Real projects, built right.")
          )
        ),

        React.createElement(Text, { style: styles.headlineWhite }, "A Full " + trade),
        React.createElement(Text, { style: styles.headlineAccent }, "Transformation"),
        React.createElement(Text, { style: styles.subText }, params.headline),

        hasBeforeAfter
          ? React.createElement(
              React.Fragment,
              {},
              React.createElement(
                View,
                { style: styles.photoLabelRow },
                React.createElement(Text, { style: styles.photoLabelBefore }, "BEFORE"),
                React.createElement(Text, { style: styles.photoLabelAfter }, "AFTER")
              ),
              React.createElement(
                View,
                { style: styles.photoRow },
                React.createElement(Image, { src: params.beforePhotoUrl!, style: styles.halfPhoto }),
                React.createElement(Image, { src: params.afterPhotoUrl!, style: styles.halfPhoto })
              )
            )
          : heroPhoto
          ? React.createElement(Image, { src: heroPhoto, style: [styles.halfPhoto, { width: "100%", border: `1pt solid ${accent}` }] })
          : null,

        React.createElement(
          View,
          { style: styles.featureGrid },
          ...featureItems.map(function (f, i) {
            return React.createElement(
              View,
              { style: styles.featureCol, key: i },
              IconBadge({ accent, size: 36, children: React.createElement(React.Fragment, {}, React.cloneElement(f.icon as React.ReactElement, { style: { color: accent } })) }),
              React.createElement(Text, { style: styles.featureLabel }, f.label),
              React.createElement(Text, { style: styles.featureDesc }, f.desc)
            );
          })
        ),

        React.createElement(
          View,
          { style: styles.ctaBand },
          React.createElement(
            View,
            { style: styles.ctaLeft },
            IconBadge({ accent, size: 34, children: React.cloneElement(ICONS.calendar as React.ReactElement, { style: { color: accent } }) }),
            React.createElement(
              View,
              { style: { marginLeft: 10 } },
              React.createElement(Text, { style: styles.ctaHeading }, "Ready for your " + React.createElement(Text, { style: styles.ctaHeadingAccent }, trade + " project?")),
              React.createElement(Text, { style: styles.ctaSub }, "Get a fast, free quote today.")
            )
          ),
          React.createElement(
            View,
            { style: styles.ctaButton },
            React.createElement(Text, { style: styles.ctaButtonText }, "GET YOUR FREE QUOTE")
          )
        ),

        React.createElement(
          View,
          { style: styles.footer },
          params.companyPhone
            ? React.createElement(
                View,
                { style: styles.footerItem },
                footerIcon(ICONS.phone),
                React.createElement(
                  View,
                  {},
                  React.createElement(Text, { style: styles.footerText }, params.companyPhone),
                  React.createElement(Text, { style: styles.footerSub }, "Call or text")
                )
              )
            : null,
          params.companyEmail
            ? React.createElement(
                View,
                { style: styles.footerItem },
                footerIcon(ICONS.mail),
                React.createElement(
                  View,
                  {},
                  React.createElement(Text, { style: styles.footerText }, params.companyEmail),
                  React.createElement(Text, { style: styles.footerSub }, "We respond fast")
                )
              )
            : null,
          params.serviceArea
            ? React.createElement(
                View,
                { style: styles.footerItem },
                footerIcon(ICONS.pin),
                React.createElement(
                  View,
                  {},
                  React.createElement(Text, { style: styles.footerText }, "Proudly Serving"),
                  React.createElement(Text, { style: styles.footerSub }, params.serviceArea)
                )
              )
            : null
        ),

        React.createElement(Text, { style: styles.footerTagline }, "LOCAL. RELIABLE. PROFESSIONAL.")
      )
    )
  );

  return renderToBuffer(doc);
}
