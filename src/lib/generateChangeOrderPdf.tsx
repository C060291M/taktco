// Change order PDF - a durable, customer-referenceable record of a scope
// or price change to an already-signed contract/estimate. Generated once
// the customer has actually approved via their own public link, not
// office-typed on their behalf - matching the legal weight the other
// signed documents already carry.
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfStyles, PdfHeader, PdfPreparedFor, PdfFooter, PdfPageFrame } from "@/lib/pdfBranding";
import { formatDateInTz } from "@/lib/formatDate";

function money(n: number) {
  const sign = n < 0 ? "-" : "+";
  return sign + "$" + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export async function generateChangeOrderPdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  timeZone: string;
  customerName: string;
  customerAddress?: string | null;
  description: string;
  amountDelta: number;
  signedByName: string | null;
  signedAt: Date | null;
  createdAt: Date;
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
      docType: "CHANGE ORDER",
      metaRows: [{ label: "Date", value: formatDateInTz(params.createdAt, tz) }]
    }),
    PdfPreparedFor({ styles, name: params.customerName, addressLines: [params.customerAddress], accentColor: params.accentColor }),

    React.createElement(
      View,
      { style: { marginTop: 6, marginBottom: 20 } },
      React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 } }, "SCOPE CHANGE"),
      React.createElement(Text, { style: { fontSize: 10, color: "#333", lineHeight: 1.6 } }, params.description)
    ),

    React.createElement(
      View,
      { style: { padding: 14, backgroundColor: "#f7f7f7", border: "1pt solid #e5e5e5", borderRadius: 3, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 } },
      React.createElement(Text, { style: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" } }, "Price Adjustment"),
      React.createElement(
        Text,
        { style: { fontSize: 16, fontWeight: 700, color: params.amountDelta >= 0 ? "#2e7d32" : "#c62828" } },
        money(params.amountDelta)
      )
    ),

    React.createElement(
      View,
      { style: { paddingTop: 14, borderTop: "1pt solid #ddd" } },
      React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, marginBottom: 3 } }, "APPROVED BY"),
      React.createElement(
        Text,
        { style: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" } },
        params.signedByName
          ? params.signedByName + (params.signedAt ? " - " + formatDateInTz(params.signedAt, tz) : "")
          : "Not yet approved"
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
