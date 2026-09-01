// Shared branding building blocks for all three document PDFs
// (generateContractPdf, generateEstimatePdf, generateInvoicePdf). Every
// visual element here is driven by the company's own Company.logoUrl and
// Company.brandAccentColor - nothing hardcoded.
//
// v4: polish pass matching the flyer's quality bar while staying on a
// light, print-friendly background - these are documents a customer needs
// to read, print, sign, and file, not a marketing piece. Adds a small icon
// accent next to "PREPARED FOR" and subtle alternating table row tinting
// for readability, without changing the overall document tone.
import { View, Text, Image, StyleSheet, Svg, Path, Circle } from "@react-pdf/renderer";
import React from "react";

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (c) { return c + c; }).join("") : clean;
  const r = Math.max(0, Math.round(parseInt(full.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(full.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(full.substring(4, 6), 16) * (1 - amount)));
  return "#" + [r, g, b].map(function (v) { return v.toString(16).padStart(2, "0"); }).join("");
}

export function pdfStyles(accentColor: string) {
  const accent = accentColor || "#1EAEC4";
  const deep = darken(accent, 0.35);

  return StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    outerBorder: { position: "absolute", top: 20, left: 20, right: 20, bottom: 20, border: "1pt solid #ccc" },
    content: { padding: 20 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
    logo: { width: 62, height: 62, marginBottom: 8, objectFit: "contain" },
    companyName: { fontSize: 15, fontWeight: 700, color: deep, marginBottom: 3 },
    companyMeta: { fontSize: 8.5, color: "#555", marginBottom: 1 },
    docTypeHeading: { fontSize: 28, fontWeight: 700, color: deep, textAlign: "right", letterSpacing: 1.5 },
    metaBlock: { marginTop: 10, alignItems: "flex-end" },
    metaRow: { flexDirection: "row", marginBottom: 2 },
    metaLabel: { fontSize: 8, color: "#888", width: 70, textAlign: "right", marginRight: 6 },
    metaValue: { fontSize: 9, fontWeight: 700, color: "#1a1a1a" },
    divider: { borderBottom: "1pt solid #ddd", marginBottom: 16 },
    preparedForRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    preparedForIconBox: { width: 16, height: 16, borderRadius: 8, backgroundColor: accent + "18", alignItems: "center", justifyContent: "center", marginRight: 6 },
    preparedForBox: { marginBottom: 16, paddingBottom: 10, borderBottom: "1pt solid #ddd" },
    preparedForLabel: { fontSize: 8, color: accent, fontWeight: 700, letterSpacing: 0.5 },
    clientName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
    clientLine: { fontSize: 9, color: "#555" },
    table: { border: "1pt solid #ddd", borderRadius: 2 },
    tableHeaderRow: { flexDirection: "row", backgroundColor: deep, paddingVertical: 7, paddingHorizontal: 10 },
    tableHeaderCell: { fontSize: 9, fontWeight: 700, color: "#fff" },
    tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderTop: "0.5pt solid #eee" },
    tableRowAlt: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderTop: "0.5pt solid #eee", backgroundColor: "#fafafa" },
    tableCell: { fontSize: 9.5, color: "#333" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1, textAlign: "right" },
    totalBlock: { marginTop: 14, alignItems: "flex-end" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", width: 190, paddingVertical: 3 },
    totalLabel: { fontSize: 10, color: "#555" },
    totalValue: { fontSize: 10, color: "#333" },
    grandTotalBox: {
      width: 190,
      marginTop: 6,
      padding: 10,
      backgroundColor: "#f7f7f7",
      border: "1pt solid #e5e5e5",
      borderRadius: 3,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    grandTotalLabel: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" },
    grandTotalValue: { fontSize: 15, fontWeight: 700, color: deep },
    statusBanner: { marginTop: 22, padding: 12, borderRadius: 4, alignItems: "center", border: "1pt solid #c8e6c9" },
    statusBannerText: { fontSize: 11, fontWeight: 700 },
    footer: { marginTop: 30, paddingTop: 12, borderTop: "1pt solid #eee", textAlign: "center" },
    footerThanks: { fontSize: 12, fontStyle: "italic", color: deep, marginBottom: 3 },
    footerSub: { fontSize: 8, color: "#999" }
  });
}

export function PdfHeader(params: {
  styles: ReturnType<typeof pdfStyles>;
  logoUrl?: string | null;
  companyName: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  docType: string;
  docNumber?: string | null;
  metaRows: { label: string; value: string }[];
}) {
  const { styles } = params;
  return React.createElement(
    View,
    { style: styles.headerRow },
    React.createElement(
      View,
      {},
      params.logoUrl ? React.createElement(Image, { src: params.logoUrl, style: styles.logo }) : null,
      React.createElement(Text, { style: styles.companyName }, params.companyName),
      params.companyPhone ? React.createElement(Text, { style: styles.companyMeta }, params.companyPhone) : null,
      params.companyEmail ? React.createElement(Text, { style: styles.companyMeta }, params.companyEmail) : null
    ),
    React.createElement(
      View,
      {},
      React.createElement(Text, { style: styles.docTypeHeading }, params.docType),
      React.createElement(
        View,
        { style: styles.metaBlock },
        ...params.metaRows.map((row, i) =>
          React.createElement(
            View,
            { style: styles.metaRow, key: i },
            React.createElement(Text, { style: styles.metaLabel }, row.label),
            React.createElement(Text, { style: styles.metaValue }, row.value)
          )
        )
      )
    )
  );
}

export function PdfPreparedFor(params: {
  styles: ReturnType<typeof pdfStyles>;
  name: string;
  addressLines?: (string | null | undefined)[];
  accentColor?: string;
}) {
  const { styles } = params;
  const accent = params.accentColor || "#1EAEC4";
  const lines = (params.addressLines || []).filter(Boolean) as string[];
  return React.createElement(
    View,
    { style: styles.preparedForBox },
    React.createElement(
      View,
      { style: styles.preparedForRow },
      React.createElement(
        View,
        { style: styles.preparedForIconBox },
        React.createElement(
          Svg,
          { width: 9, height: 9, viewBox: "0 0 24 24" },
          React.createElement(Circle, { cx: 12, cy: 8, r: 4, fill: "none", stroke: accent, strokeWidth: 2 }),
          React.createElement(Path, { d: "M4 21 C4 16 7.5 14 12 14 C16.5 14 20 16 20 21", fill: "none", stroke: accent, strokeWidth: 2 })
        )
      ),
      React.createElement(Text, { style: styles.preparedForLabel }, "PREPARED FOR")
    ),
    React.createElement(Text, { style: styles.clientName }, params.name),
    ...lines.map((line, i) => React.createElement(Text, { style: styles.clientLine, key: i }, line))
  );
}

export function PdfFooter(params: { styles: ReturnType<typeof pdfStyles>; companyName: string }) {
  const { styles } = params;
  return React.createElement(
    View,
    { style: styles.footer },
    React.createElement(Text, { style: styles.footerThanks }, "Thank you for your business!"),
    React.createElement(Text, { style: styles.footerSub }, `${params.companyName} - powered by TAKTCO`)
  );
}

export function PdfPageFrame(params: { styles: ReturnType<typeof pdfStyles>; children: React.ReactNode }) {
  const { styles } = params;
  return React.createElement(
    React.Fragment,
    {},
    React.createElement(View, { style: styles.outerBorder, fixed: true }),
    React.createElement(View, { style: styles.content }, params.children)
  );
}
