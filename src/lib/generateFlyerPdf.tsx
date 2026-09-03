// Generates a downloadable, bright and bold marketing flyer for a single
// job - classic local-business flyer energy: solid accent-color header
// band, filled icon badges (not thin outlines), bold before/after photo
// section with an overlapping quality seal, feature grid, and a punchy CTA
// band. All content is either real job/company data or generic,
// trade-agnostic marketing copy - nothing company-specific is invented.
import { Document, Page, Text, View, Image, StyleSheet, Svg, Path, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

function getContrastText(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (c) { return c + c; }).join("") : clean;
  if (full.length !== 6) return "#ffffff";
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#1a1a1a" : "#ffffff";
}

function FilledIconBadge(params: { bg: string; iconColor: string; children: React.ReactNode; size?: number }) {
  const size = params.size || 46;
  return React.createElement(
    View,
    { style: { width: size, height: size, borderRadius: size / 2, backgroundColor: params.bg, alignItems: "center", justifyContent: "center", alignSelf: "center" } },
    React.createElement(Svg, { width: size * 0.48, height: size * 0.48, viewBox: "0 0 24 24" }, params.children)
  );
}

const ICONS = {
  shield: React.createElement(Path, { d: "M12 2 L20 6 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V6 Z M9 12 L11 14 L15 9", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  tools: React.createElement(Path, { d: "M4 20 L14 10 M17 3 L21 7 L18 10 L14 6 Z M3 21 L7 17", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  lock: React.createElement(Path, { d: "M6 11 H18 V21 H6 Z M8 11 V7 A4 4 0 0 1 16 7 V11", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  house: React.createElement(Path, { d: "M4 11 L12 4 L20 11 M6 10 V20 H18 V10", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  calendar: React.createElement(Path, { d: "M4 6 H20 V21 H4 Z M4 10 H20 M8 3 V7 M16 3 V7 M8 14 L10 16 L15 11", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  phone: React.createElement(Path, { d: "M5 4 L9 4 L11 9 L8 11 C9 14 10 15 13 16 L15 13 L20 15 L20 19 C20 20 19 21 18 21 C10 21 3 14 3 6 C3 5 4 4 5 4 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  mail: React.createElement(Path, { d: "M4 6 H20 V18 H4 Z M4 6 L12 13 L20 6", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  pin: React.createElement(Path, { d: "M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2 Z M12 12 A3 3 0 1 0 12 6 A3 3 0 0 0 12 12 Z", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }),
  star: React.createElement(Path, { d: "M12 2 L14.5 8.5 L21 9 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9 L9.5 8.5 Z", fill: "currentColor", stroke: "none" })
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
  const onAccent = getContrastText(accent);
  const trade = params.tradeType || "construction";
  const tradeLower = trade.toLowerCase();

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", backgroundColor: "#ffffff" },
    headerBand: { backgroundColor: accent, paddingVertical: 20, paddingHorizontal: 28, flexDirection: "row", alignItems: "center" },
    logoChip: { width: 54, height: 54, borderRadius: 8, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginRight: 14, padding: 4 },
    logo: { width: "100%", height: "100%", objectFit: "contain" },
    companyName: { color: onAccent, fontSize: 16, fontWeight: 700 },
    headerDividerV: { width: 1, height: 44, backgroundColor: onAccent + "55", marginHorizontal: 18 },
    eyebrow: { color: onAccent, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 },
    headerSub: { color: onAccent, opacity: 0.9, fontSize: 9.5, lineHeight: 1.5 },
    content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 18 },
    headlineDark: { color: "#1a1a1a", fontSize: 28, fontWeight: 700, textAlign: "center", lineHeight: 1.1, letterSpacing: -0.3 },
    headlineAccent: { color: accent, fontSize: 28, fontWeight: 700, textAlign: "center", lineHeight: 1.1, letterSpacing: -0.3 },
    subText: { color: "#666666", fontSize: 10, textAlign: "center", marginTop: 8, marginBottom: 14, lineHeight: 1.5, paddingHorizontal: 30 },
    photoWrap: { position: "relative" },
    photoLabelRow: { flexDirection: "row" },
    photoLabelBefore: { flex: 1, textAlign: "center", backgroundColor: "#2a2f38", color: "#ffffff", fontSize: 9, fontWeight: 700, paddingVertical: 7, letterSpacing: 0.6 },
    photoLabelAfter: { flex: 1, textAlign: "center", backgroundColor: accent, color: onAccent, fontSize: 9, fontWeight: 700, paddingVertical: 7, letterSpacing: 0.6 },
    photoRow: { flexDirection: "row", border: `2pt solid ${accent}` },
    halfPhoto: { width: "50%", height: 190, objectFit: "cover" },
    seal: {
      position: "absolute",
      top: 130,
      left: 216,
      width: 124,
      backgroundColor: accent,
      borderRadius: 8,
      padding: 11,
      alignItems: "center",
      border: "2pt solid #ffffff"
    },
    sealIconBg: { backgroundColor: "#ffffff22" },
    sealLabel: { color: onAccent, fontSize: 8.5, fontWeight: 700, textAlign: "center", lineHeight: 1.35, marginTop: 6 },
    sealStars: { flexDirection: "row", marginTop: 5 },
    featureGrid: { flexDirection: "row", marginTop: 18, borderTop: "2pt solid #f0f0f0", paddingTop: 14 },
    featureCol: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
    featureLabel: { color: "#1a1a1a", fontSize: 8.5, fontWeight: 700, textAlign: "center", marginTop: 9, marginBottom: 3, letterSpacing: 0.3 },
    featureDesc: { color: "#888888", fontSize: 7.5, textAlign: "center", lineHeight: 1.35 },
    ctaBand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, backgroundColor: accent, padding: 16, borderRadius: 8 },
    ctaLeft: { flexDirection: "row", alignItems: "center" },
    ctaHeading: { color: onAccent, fontSize: 13, fontWeight: 700 },
    ctaSub: { color: onAccent, opacity: 0.85, fontSize: 8.5, marginTop: 2 },
    ctaButton: { backgroundColor: "#ffffff", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 5 },
    ctaButtonText: { color: accent, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3 },
    footer: { flexDirection: "row", justifyContent: "space-around", marginTop: 16, paddingTop: 14, paddingHorizontal: 28, backgroundColor: "#f7f7f8", paddingBottom: 14 },
    footerItem: { flexDirection: "row", alignItems: "center" },
    footerIconBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: accent, alignItems: "center", justifyContent: "center", marginRight: 7 },
    footerText: { color: "#1a1a1a", fontSize: 8.5, fontWeight: 700 },
    footerSub: { color: "#888888", fontSize: 7 },
    footerTaglineWrap: { backgroundColor: "#f7f7f8", paddingBottom: 12, paddingTop: 4 },
    footerTagline: { color: accent, fontSize: 9.5, fontWeight: 700, textAlign: "center", letterSpacing: 0.6 }
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
      React.createElement(Svg, { width: 14, height: 14, viewBox: "0 0 24 24", style: { color: onAccent } }, icon)
    );
  }

  function star(i: number) {
    return React.createElement(Svg, { key: i, width: 9, height: 9, viewBox: "0 0 24 24", style: { color: onAccent, marginHorizontal: 1 } }, ICONS.star);
  }

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },

      React.createElement(
        View,
        { style: styles.headerBand },
        params.logoUrl
          ? React.createElement(View, { style: styles.logoChip }, React.createElement(Image, { src: params.logoUrl, style: styles.logo }))
          : null,
        React.createElement(Text, { style: styles.companyName }, params.companyName),
        React.createElement(View, { style: styles.headerDividerV }),
        React.createElement(
          View,
          {},
          React.createElement(Text, { style: styles.eyebrow }, "PROJECT SPOTLIGHT"),
          React.createElement(Text, { style: styles.headerSub }, "Real " + tradeLower + ". Real results.\nBuilt to elevate your property.")
        )
      ),

      React.createElement(
        View,
        { style: styles.content },

        React.createElement(Text, { style: styles.headlineDark }, "A Full " + trade),
        React.createElement(Text, { style: styles.headlineAccent }, "Transformation"),
        React.createElement(Text, { style: styles.subText }, params.headline),

        hasBeforeAfter
          ? React.createElement(
              View,
              { style: styles.photoWrap },
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
              ),
              React.createElement(
                View,
                { style: styles.seal },
                FilledIconBadge({ bg: "#ffffff33", iconColor: onAccent, size: 32, children: React.cloneElement(ICONS.shield as React.ReactElement, { style: { color: onAccent } }) }),
                React.createElement(Text, { style: styles.sealLabel }, "QUALITY GUARANTEED"),
                React.createElement(View, { style: styles.sealStars }, star(0), star(1), star(2))
              )
            )
          : heroPhoto
          ? React.createElement(Image, { src: heroPhoto, style: [styles.halfPhoto, { width: "100%", border: `2pt solid ${accent}` }] })
          : null,

        React.createElement(
          View,
          { style: styles.featureGrid },
          ...featureItems.map(function (f, i) {
            return React.createElement(
              View,
              { style: styles.featureCol, key: i },
              FilledIconBadge({ bg: accent, iconColor: onAccent, size: 40, children: React.cloneElement(f.icon as React.ReactElement, { style: { color: onAccent } }) }),
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
            FilledIconBadge({ bg: "#ffffff33", iconColor: onAccent, size: 38, children: React.cloneElement(ICONS.calendar as React.ReactElement, { style: { color: onAccent } }) }),
            React.createElement(
              View,
              { style: { marginLeft: 12 } },
              React.createElement(Text, { style: styles.ctaHeading }, "Ready for your " + trade + " project?"),
              React.createElement(Text, { style: styles.ctaSub }, "Get a fast, free quote today.")
            )
          ),
          React.createElement(
            View,
            { style: styles.ctaButton },
            React.createElement(Text, { style: styles.ctaButtonText }, "GET YOUR FREE QUOTE")
          )
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
              React.createElement(View, {}, React.createElement(Text, { style: styles.footerText }, params.companyPhone), React.createElement(Text, { style: styles.footerSub }, "Call or text"))
            )
          : null,
        params.companyEmail
          ? React.createElement(
              View,
              { style: styles.footerItem },
              footerIcon(ICONS.mail),
              React.createElement(View, {}, React.createElement(Text, { style: styles.footerText }, params.companyEmail), React.createElement(Text, { style: styles.footerSub }, "We respond fast"))
            )
          : null,
        params.serviceArea
          ? React.createElement(
              View,
              { style: styles.footerItem },
              footerIcon(ICONS.pin),
              React.createElement(View, {}, React.createElement(Text, { style: styles.footerText }, "Proudly Serving"), React.createElement(Text, { style: styles.footerSub }, params.serviceArea))
            )
          : null
      ),
      React.createElement(
        View,
        { style: styles.footerTaglineWrap },
        React.createElement(Text, { style: styles.footerTagline }, "LOCAL. RELIABLE. PROFESSIONAL.")
      )
    )
  );

  return renderToBuffer(doc);
}
