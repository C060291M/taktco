// Shared branding building blocks for all three PDF generators
// (generateContractPdf, generateEstimatePdf, generateInvoicePdf).
// Every visual element here is driven by the company's own
// Company.logoUrl and Company.brandAccentColor - nothing hardcoded.
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import React from "react";

export function pdfStyles(accentColor: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    logo: { width: 48, height: 48, marginBottom: 8, objectFit: "contain" },
    companyName: { fontSize: 15, fontWeight: 700, color: accentColor, marginBottom: 4 },
    companyMeta: { fontSize: 9, color: "#555", marginBottom: 1 },
    docTypeHeading: { fontSize: 26, fontWeight: 700, color: accentColor, textAlign: "right", letterSpacing: 1 },
    metaBlock: { marginTop: 8, alignItems: "flex-end" },
    metaRow: { flexDirection: "row", marginBottom: 2 },
    metaLabel: { fontSize: 8, color: "#888", width: 70, textAlign: "right", marginRight: 6 },
    metaValue: { fontSize: 9, fontWeight: 700, color: "#1a1a1a" },
    preparedForBox: { marginTop: 4, marginBottom: 18, paddingTop: 10, borderTop: "1pt solid #ddd" },
    preparedForLabel: { fontSize: 8, color: accentColor, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 },
    clientName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
    clientLine: { fontSize: 9, color: "#555" },
    tableHeaderRow: { flexDirection: "row", backgroundColor: accentColor, paddingVertical: 6, paddingHorizontal: 8 },
    tableHeaderCell: { fontSize: 9, fontWeight: 700, color: "#fff" },
    tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderBottom: "0.5pt solid #eee" },
    tableCell: { fontSize: 9.5, color: "#333" },
    colDesc: { flex: 3 },
    colQty: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1, textAlign: "right" },
    totalBlock: { marginTop: 14, alignItems: "flex-end" },
    totalRow: { flexDirection: "row", justifyContent: "space-between", width: 180, paddingVertical: 3 },
    totalLabel: { fontSize: 10, color: "#555" },
    totalValue: { fontSize: 10, color: "#333" },
    grandTotalRow: { flexDirection: "row", justifyContent: "space-between", width: 180, paddingTop: 8, marginTop: 4, borderTop: `1.5pt solid ${accentColor}` },
    grandTotalLabel: { fontSize: 12, fontWeight: 700, color: "#1a1a1a" },
    grandTotalValue: { fontSize: 14, fontWeight: 700, color: accentColor },
    statusBanner: { marginTop: 24, padding: 12, borderRadius: 4, alignItems: "center" },
    statusBannerText: { fontSize: 11, fontWeight: 700 },
    footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center" },
    footerThanks: { fontSize: 12, fontStyle: "italic", color: accentColor, marginBottom: 3 },
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
}) {
  const { styles } = params;
  const lines = (params.addressLines || []).filter(Boolean) as string[];
  return React.createElement(
    View,
    { style: styles.preparedForBox },
    React.createElement(Text, { style: styles.preparedForLabel }, "PREPARED FOR"),
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
