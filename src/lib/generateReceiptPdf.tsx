// Payment receipt PDF - a distinct, minimal document type from the invoice
// itself, per the "receipts are their own document, not a re-itemized
// invoice" design goal. Reuses the same shared branding components
// (logo, accent color, header/footer) as the other document PDFs so it
// stays visually consistent with everything else the company sends.
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfStyles, PdfHeader, PdfPreparedFor, PdfFooter, PdfPageFrame } from "@/lib/pdfBranding";
import { formatDateInTz } from "@/lib/formatDate";

function money(n: number) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generateReceiptPdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  timeZone: string;
  customerName: string;
  customerAddress?: string | null;
  invoiceNumber: string | null;
  paymentAmount: number;
  paymentMethod: string;
  paidAt: Date;
  remainingBalance: number;
}) {
  const styles = pdfStyles(params.accentColor || "#1EAEC4");
  const tz = params.timeZone || "America/Chicago";

  const body = React.createElement(
    React.Fragment,
    {},
    PdfHeader({
      styles,
      logoUrl: params.logoUrl,
      companyName: params.companyName,
      companyPhone: params.companyPhone,
      companyEmail: params.companyEmail,
      docType: "RECEIPT",
      metaRows: [
        { label: "Invoice #", value: params.invoiceNumber || "-" },
        { label: "Date", value: formatDateInTz(params.paidAt, tz) }
      ]
    }),
    PdfPreparedFor({ styles, name: params.customerName, addressLines: [params.customerAddress] }),

    React.createElement(
      View,
      { style: { marginTop: 6, marginBottom: 22, padding: 18, backgroundColor: "#e8f5e9", borderRadius: 4, alignItems: "center" } },
      React.createElement(Text, { style: { fontSize: 16, fontWeight: 700, color: "#2e7d32", marginBottom: 4 } }, "PAYMENT RECEIVED"),
      React.createElement(Text, { style: { fontSize: 22, fontWeight: 700, color: "#2e7d32" } }, money(params.paymentAmount))
    ),

    React.createElement(
      View,
      { style: { border: "1pt solid #ddd", borderRadius: 3 } },
      React.createElement(
        View,
        { style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottom: "0.5pt solid #eee" } },
        React.createElement(Text, { style: { fontSize: 9.5, color: "#888" } }, "Payment date"),
        React.createElement(Text, { style: { fontSize: 9.5, fontWeight: 700, color: "#1a1a1a" } }, formatDateInTz(params.paidAt, tz))
      ),
      React.createElement(
        View,
        { style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottom: "0.5pt solid #eee" } },
        React.createElement(Text, { style: { fontSize: 9.5, color: "#888" } }, "Payment method"),
        React.createElement(Text, { style: { fontSize: 9.5, fontWeight: 700, color: "#1a1a1a" } }, params.paymentMethod)
      ),
      React.createElement(
        View,
        { style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12, borderBottom: "0.5pt solid #eee" } },
        React.createElement(Text, { style: { fontSize: 9.5, color: "#888" } }, "Invoice reference"),
        React.createElement(Text, { style: { fontSize: 9.5, fontWeight: 700, color: "#1a1a1a" } }, params.invoiceNumber || "-")
      ),
      React.createElement(
        View,
        { style: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 12 } },
        React.createElement(Text, { style: { fontSize: 9.5, color: "#888" } }, "Remaining balance"),
        React.createElement(
          Text,
          { style: { fontSize: 9.5, fontWeight: 700, color: params.remainingBalance > 0 ? "#c62828" : "#2e7d32" } },
          params.remainingBalance > 0 ? money(params.remainingBalance) : "Paid in full"
        )
      )
    ),

    PdfFooter({ styles, companyName: params.companyName })
  );

  const doc = React.createElement(
    Document,
    {},
    React.createElement(Page, { size: "LETTER", style: styles.page }, PdfPageFrame({ styles, children: body }))
  );

  return renderToBuffer(doc);
}
