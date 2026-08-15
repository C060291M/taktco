import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfStyles, PdfHeader, PdfPreparedFor, PdfFooter } from "@/lib/pdfBranding";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

function money(n: number) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function generateEstimatePdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName: string;
  customerAddress?: string | null;
  estimateNumber: string | null;
  totalAmount: number;
  lineItems: LineItem[];
  warranty: string | null;
  terms: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}) {
  const styles = pdfStyles(params.accentColor || "#1EAEC4");

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      PdfHeader({
        styles,
        logoUrl: params.logoUrl,
        companyName: params.companyName,
        companyPhone: params.companyPhone,
        companyEmail: params.companyEmail,
        docType: "ESTIMATE",
        metaRows: [
          { label: "Estimate #", value: params.estimateNumber || "-" },
          { label: "Date", value: new Date(params.createdAt).toLocaleDateString() }
        ]
      }),
      PdfPreparedFor({ styles, name: params.customerName, addressLines: [params.customerAddress] }),

      React.createElement(
        View,
        {},
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colDesc] }, "Item"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colQty] }, "Qty"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colPrice] }, "Price")
        ),
        ...params.lineItems.map((li, i) =>
          React.createElement(
            View,
            { style: styles.tableRow, key: i },
            React.createElement(Text, { style: [styles.tableCell, styles.colDesc] }, li.description),
            React.createElement(Text, { style: [styles.tableCell, styles.colQty] }, `${li.qty} ${li.unit}`),
            React.createElement(Text, { style: [styles.tableCell, styles.colPrice] }, money(li.qty * li.unitPrice))
          )
        )
      ),

      React.createElement(
        View,
        { style: styles.totalBlock },
        React.createElement(
          View,
          { style: styles.grandTotalRow },
          React.createElement(Text, { style: styles.grandTotalLabel }, "Total"),
          React.createElement(Text, { style: styles.grandTotalValue }, money(params.totalAmount))
        )
      ),

      params.warranty
        ? React.createElement(
            View,
            { style: { marginTop: 16 } },
            React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, marginBottom: 2 } }, "WARRANTY"),
            React.createElement(Text, { style: { fontSize: 9.5, color: "#555" } }, params.warranty)
          )
        : null,
      params.terms
        ? React.createElement(
            View,
            { style: { marginTop: 10 } },
            React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, marginBottom: 2 } }, "TERMS"),
            React.createElement(Text, { style: { fontSize: 9.5, color: "#555" } }, params.terms)
          )
        : null,

      params.approvedAt
        ? React.createElement(
            View,
            { style: [styles.statusBanner, { backgroundColor: "#e8f5e9" }] },
            React.createElement(
              Text,
              { style: [styles.statusBannerText, { color: "#2e7d32" }] },
              `Approved on ${new Date(params.approvedAt).toLocaleDateString()}`
            )
          )
        : null,

      PdfFooter({ styles, companyName: params.companyName })
    )
  );

  return renderToBuffer(doc);
}
