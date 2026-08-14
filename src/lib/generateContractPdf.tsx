// Server-side PDF generation for signed/approved/paid documents, so clients
// have a real file to download/keep - not just a webpage they can view once.
// Uses @react-pdf/renderer (pure JS, no headless-browser dependency, safe
// on Railway) rather than Puppeteer.
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 20, borderBottom: "1pt solid #333", paddingBottom: 10 },
  companyName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  title: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#555" },
  content: { marginTop: 10, marginBottom: 20, lineHeight: 1.5 },
  signatureBlock: { marginTop: 24, borderTop: "1pt solid #ccc", paddingTop: 12 },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  signatureLabel: { fontSize: 9, color: "#666", marginBottom: 2 },
  signatureValue: { fontSize: 11, fontWeight: 700 }
});

export async function generateContractPdf(params: {
  companyName: string;
  customerName: string;
  title: string;
  content: string | null;
  companySignedByName: string | null;
  companySignedAt: Date | null;
  signedByName: string | null;
  signedAt: Date | null;
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
      React.createElement(Text, { style: styles.title }, params.title),
      React.createElement(Text, {}, `For: ${params.customerName}`),
      params.content
        ? React.createElement(Text, { style: styles.content }, params.content)
        : null,
      React.createElement(
        View,
        { style: styles.signatureBlock },
        React.createElement(
          View,
          { style: styles.signatureRow },
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.signatureLabel }, "Signed by company"),
            React.createElement(
              Text,
              { style: styles.signatureValue },
              params.companySignedByName
                ? `${params.companySignedByName} - ${params.companySignedAt ? new Date(params.companySignedAt).toLocaleDateString() : ""}`
                : "Not signed"
            )
          ),
          React.createElement(
            View,
            {},
            React.createElement(Text, { style: styles.signatureLabel }, "Signed by customer"),
            React.createElement(
              Text,
              { style: styles.signatureValue },
              params.signedByName
                ? `${params.signedByName} - ${params.signedAt ? new Date(params.signedAt).toLocaleDateString() : ""}`
                : "Not signed"
            )
          )
        )
      )
    )
  );

  return renderToBuffer(doc);
}
