// Server-side PDF generation for an approved estimate, mirroring
// generateContractPdf.tsx - see that file for the library choice rationale.
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "1pt solid #333", paddingBottom: 10 },
  companyName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  title: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 8 },
  table: { marginTop: 10, marginBottom: 10 },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1pt solid #999", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5pt solid #ddd" },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1pt solid #333" },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700 },
  section: { marginTop: 16 },
  sectionLabel: { fontSize: 9, color: "#666", marginBottom: 2, textTransform: "uppercase" },
  approvedBanner: { marginTop: 20, padding: 10, backgroundColor: "#e8f5e9", borderRadius: 4 },
  approvedText: { color: "#2e7d32", fontWeight: 700 }
});

function money(n: number) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function generateEstimatePdf(params: {
  companyName: string;
  customerName: string;
  estimateNumber: string | null;
  totalAmount: number;
  lineItems: LineItem[];
  warranty: string | null;
  terms: string | null;
  approvedAt: Date | null;
}) {
  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.companyName }, params.companyName)
      ),
      React.createElement(Text, { style: styles.title }, `Estimate${params.estimateNumber ? ` #${params.estimateNumber}` : ""}`),
      React.createElement(Text, {}, `For: ${params.customerName}`),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: styles.colDesc }, "Item"),
          React.createElement(Text, { style: styles.colQty }, "Qty"),
          React.createElement(Text, { style: styles.colPrice }, "Price")
        ),
        ...params.lineItems.map((li, i) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: i },
            React.createElement(Text, { style: styles.colDesc }, li.description),
            React.createElement(Text, { style: styles.colQty }, `${li.qty} ${li.unit}`),
            React.createElement(Text, { style: styles.colPrice }, money(li.qty * li.unitPrice))
          )
        )
      ),
      React.createElement(
        View,
        { style: styles.totalRow },
        React.createElement(Text, { style: styles.totalLabel }, "Total"),
        React.createElement(Text, { style: styles.totalValue }, money(params.totalAmount))
      ),
      params.warranty
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.sectionLabel }, "Warranty"),
            React.createElement(Text, {}, params.warranty)
          )
        : null,
      params.terms
        ? React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.sectionLabel }, "Terms"),
            React.createElement(Text, {}, params.terms)
          )
        : null,
      React.createElement(
        View,
        { style: styles.approvedBanner },
        React.createElement(
          Text,
          { style: styles.approvedText },
          `Approved${params.approvedAt ? ` on ${new Date(params.approvedAt).toLocaleDateString()}` : ""}`
        )
      )
    )
  );

  return renderToBuffer(doc);
}
