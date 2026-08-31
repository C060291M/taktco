// Generates a downloadable, Canva-style marketing flyer for a single job -
// distinct from the document-style PDFs (contract/estimate/invoice), this
// is photo-forward: big before/after hero images, a short headline, and a
// contact-info footer band. Meant to be shared directly (printed, texted,
// posted) rather than kept as a business record.
//
// v2: uses a computed "deep" shade of the company's own accent color for
// the header band, so any bright/light brand color still reads as
// professional weight against the dark footer bar, matching the same
// darkening technique used for the document PDFs.
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (c) { return c + c; }).join("") : clean;
  const r = Math.max(0, Math.round(parseInt(full.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(full.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(full.substring(4, 6), 16) * (1 - amount)));
  return "#" + [r, g, b].map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
}

export async function generateFlyerPdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  serviceArea?: string | null;
  headline: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  singlePhotoUrl?: string | null;
}) {
  const accent = params.accentColor || "#1EAEC4";
  const deep = darken(accent, 0.35);
  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica" },
    header: { backgroundColor: deep, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    logo: { width: 50, height: 50, objectFit: "contain" },
    companyName: { color: "#ffffff", fontSize: 16, fontWeight: 700 },
    photoRow: { flexDirection: "row" },
    halfPhoto: { width: "50%", height: 320, objectFit: "cover" },
    fullPhoto: { width: "100%", height: 380, objectFit: "cover" },
    photoLabelRow: { flexDirection: "row" },
    photoLabel: { width: "50%", textAlign: "center", fontSize: 9, color: "#888", paddingVertical: 4, textTransform: "uppercase", letterSpacing: 1 },
    headlineBlock: { padding: 28, alignItems: "center" },
    headline: { fontSize: 20, fontWeight: 700, color: "#1a1a1a", textAlign: "center", lineHeight: 1.4 },
    footer: { backgroundColor: "#1a1a1a", padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    footerText: { color: "#ffffff", fontSize: 12, fontWeight: 700 },
    footerAccent: { color: accent, fontSize: 12, fontWeight: 700 }
  });

  const hasBeforeAfter = params.beforePhotoUrl && params.afterPhotoUrl;
  const heroPhoto = params.singlePhotoUrl || params.afterPhotoUrl || params.beforePhotoUrl;

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: { flexDirection: "row", alignItems: "center" } },
          params.logoUrl
            ? React.createElement(Image, { src: params.logoUrl, style: [styles.logo, { marginRight: 10 }] })
            : null,
          React.createElement(Text, { style: styles.companyName }, params.companyName)
        )
      ),

      hasBeforeAfter
        ? React.createElement(
            React.Fragment,
            {},
            React.createElement(
              View,
              { style: styles.photoRow },
              React.createElement(Image, { src: params.beforePhotoUrl!, style: styles.halfPhoto }),
              React.createElement(Image, { src: params.afterPhotoUrl!, style: styles.halfPhoto })
            ),
            React.createElement(
              View,
              { style: styles.photoLabelRow },
              React.createElement(Text, { style: styles.photoLabel }, "BEFORE"),
              React.createElement(Text, { style: styles.photoLabel }, "AFTER")
            )
          )
        : heroPhoto
        ? React.createElement(Image, { src: heroPhoto, style: styles.fullPhoto })
        : null,

      React.createElement(
        View,
        { style: styles.headlineBlock },
        React.createElement(Text, { style: styles.headline }, params.headline)
      ),

      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          {},
          React.createElement(Text, { style: styles.footerText }, "Call today "),
          params.companyPhone ? React.createElement(Text, { style: styles.footerAccent }, params.companyPhone) : null,
          params.serviceArea
            ? React.createElement(Text, { style: styles.footerText }, `  |  Serving ${params.serviceArea}`)
            : null
        )
      )
    )
  );

  return renderToBuffer(doc);
}

