import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfStyles, PdfHeader, PdfPreparedFor, PdfFooter } from "@/lib/pdfBranding";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

function money(n: number) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function generateInvoicePdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  customerName: string;
  customerAddress?: string | null;
  invoiceNumber: string | null;
  amount: number;
  taxAmount: number;
  lineItems: LineItem[];
  dueDate?: Date | null;
  paidAt: Date | null;
  paymentMethod: string | null;
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
        docType: "INVOICE",
        metaRows: [
          { label: "Invoice #", value: params.invoiceNumber || "-" },
          { label: "Date", value: new Date(params.createdAt).toLocaleDateString() },
          ...(params.dueDate ? [{ label: "Due", value: new Date(params.dueDate).toLocaleDateString() }] : [])
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
        params.taxAmount > 0
          ? React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.totalLabel }, "Tax"),
              React.createElement(Text, { style: styles.totalValue }, money(params.taxAmount))
            )
          : null,
        React.createElement(
          View,
          { style: styles.grandTotalRow },
          React.createElement(Text, { style: styles.grandTotalLabel }, params.paidAt ? "Total paid" : "Amount due"),
          React.createElement(Text, { style: styles.grandTotalValue }, money(params.amount))
        )
      ),

      params.paidAt
        ? React.createElement(
            View,
            { style: [styles.statusBanner, { backgroundColor: "#e8f5e9" }] },
            React.createElement(
              Text,
              { style: [styles.statusBannerText, { color: "#2e7d32" }] },
              `Paid in full on ${new Date(params.paidAt).toLocaleDateString()}${params.paymentMethod ? ` via ${params.paymentMethod}` : ""}`
            )
          )
        : null,

      PdfFooter({ styles, companyName: params.companyName })
    )
  );

  return renderToBuffer(doc);
}
