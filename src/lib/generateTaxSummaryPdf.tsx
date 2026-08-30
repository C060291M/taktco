// Tax Prep Summary - an organized export of a calendar year's paid invoices,
// meant to be handed directly to an accountant/bookkeeper. Deliberately
// does NOT attempt any refund/deduction calculation - TAKTCO tracks revenue
// in, not expenses/payroll/overhead, so that math isn't ours to do. This is
// the raw, itemized revenue-and-tax-collected data an accountant needs.
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

type InvoiceRow = { invoiceNumber: string | null; customerName: string; paidAt: string; amount: number; taxAmount: number };

function money(n: number) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateTaxSummaryPdf(params: {
  companyName: string;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  accentColor: string;
  year: number;
  invoices: InvoiceRow[];
}) {
  const accent = params.accentColor || "#1EAEC4";
  const totalRevenue = params.invoices.reduce(function (sum, i) { return sum + i.amount; }, 0);
  const totalTax = params.invoices.reduce(function (sum, i) { return sum + i.taxAmount; }, 0);

  const styles = StyleSheet.create({
    page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
    heading: { fontSize: 20, fontWeight: 700, color: accent, marginBottom: 4 },
    subheading: { fontSize: 11, color: "#555", marginBottom: 16 },
    companyBlock: { marginBottom: 20, paddingBottom: 14, borderBottom: "1pt solid #ddd" },
    companyName: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
    companyLine: { fontSize: 9, color: "#555" },
    summaryRow: { flexDirection: "row", marginBottom: 20 },
    summaryBox: { flex: 1, padding: 12, backgroundColor: "#f7f7f7", border: "1pt solid #e5e5e5", borderRadius: 3, marginRight: 10 },
    summaryLabel: { fontSize: 8, color: "#888", marginBottom: 4, textTransform: "uppercase" },
    summaryValue: { fontSize: 16, fontWeight: 700, color: "#1a1a1a" },
    tableHeaderRow: { flexDirection: "row", backgroundColor: accent, paddingVertical: 6, paddingHorizontal: 8 },
    tableHeaderCell: { fontSize: 8, fontWeight: 700, color: "#fff" },
    tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTop: "0.5pt solid #eee" },
    tableCell: { fontSize: 8.5, color: "#333" },
    colInvoice: { flex: 1.2 },
    colCustomer: { flex: 2 },
    colDate: { flex: 1.2 },
    colAmount: { flex: 1, textAlign: "right" },
    colTax: { flex: 1, textAlign: "right" },
    disclaimer: { marginTop: 20, fontSize: 7.5, color: "#999", lineHeight: 1.5 }
  });

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(Text, { style: styles.heading }, "Tax Prep Summary"),
      React.createElement(Text, { style: styles.subheading }, "Calendar Year " + params.year),

      React.createElement(
        View,
        { style: styles.companyBlock },
        React.createElement(Text, { style: styles.companyName }, params.companyName),
        params.businessAddress ? React.createElement(Text, { style: styles.companyLine }, params.businessAddress) : null,
        params.businessPhone ? React.createElement(Text, { style: styles.companyLine }, params.businessPhone) : null,
        params.businessEmail ? React.createElement(Text, { style: styles.companyLine }, params.businessEmail) : null
      ),

      React.createElement(
        View,
        { style: styles.summaryRow },
        React.createElement(
          View,
          { style: styles.summaryBox },
          React.createElement(Text, { style: styles.summaryLabel }, "Total Revenue Collected"),
          React.createElement(Text, { style: styles.summaryValue }, money(totalRevenue))
        ),
        React.createElement(
          View,
          { style: [styles.summaryBox, { marginRight: 0 }] },
          React.createElement(Text, { style: styles.summaryLabel }, "Total Tax Collected"),
          React.createElement(Text, { style: styles.summaryValue }, money(totalTax))
        )
      ),

      React.createElement(
        View,
        {},
        React.createElement(
          View,
          { style: styles.tableHeaderRow },
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colInvoice] }, "Invoice #"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colCustomer] }, "Customer"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colDate] }, "Date Paid"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colAmount] }, "Amount"),
          React.createElement(Text, { style: [styles.tableHeaderCell, styles.colTax] }, "Tax")
        ),
        params.invoices.map(function (inv, i) {
          return React.createElement(
            View,
            { style: styles.tableRow, key: i },
            React.createElement(Text, { style: [styles.tableCell, styles.colInvoice] }, inv.invoiceNumber || "-"),
            React.createElement(Text, { style: [styles.tableCell, styles.colCustomer] }, inv.customerName),
            React.createElement(Text, { style: [styles.tableCell, styles.colDate] }, inv.paidAt),
            React.createElement(Text, { style: [styles.tableCell, styles.colAmount] }, money(inv.amount)),
            React.createElement(Text, { style: [styles.tableCell, styles.colTax] }, money(inv.taxAmount))
          );
        })
      ),

      React.createElement(
        Text,
        { style: styles.disclaimer },
        "This summary lists revenue actually collected during the calendar year shown, based on payment dates, along with tax amounts charged on those invoices. It does not include business expenses, payroll, overhead, or any deduction calculations, and is not tax advice. Provide this alongside your full financial records to your accountant or tax preparer."
      )
    )
  );

  return renderToBuffer(doc);
}
