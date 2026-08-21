import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { pdfStyles, PdfHeader, PdfPreparedFor, PdfFooter, PdfPageFrame } from "@/lib/pdfBranding";
import { formatDateInTz } from "@/lib/formatDate";

export async function generateContractPdf(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  timeZone: string;
  customerName: string;
  customerAddress?: string | null;
  title: string;
  content: string | null;
  companySignedByName: string | null;
  companySignedAt: Date | null;
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
      docType: params.title.toUpperCase(),
      metaRows: [{ label: "Date", value: formatDateInTz(params.createdAt, tz) }]
    }),
    PdfPreparedFor({ styles, name: params.customerName, addressLines: [params.customerAddress] }),

    params.content
      ? React.createElement(
          View,
          { style: { marginTop: 4, marginBottom: 20 } },
          React.createElement(Text, { style: { fontSize: 9.5, color: "#333", lineHeight: 1.6 } }, params.content)
        )
      : null,

    React.createElement(
      View,
      { style: { marginTop: 10, paddingTop: 14, borderTop: "1pt solid #ddd" } },
      React.createElement(
        View,
        { style: { flexDirection: "row", justifyContent: "space-between" } },
        React.createElement(
          View,
          { style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, marginBottom: 3 } }, "SIGNED BY COMPANY"),
          React.createElement(
            Text,
            { style: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" } },
            params.companySignedByName
              ? `${params.companySignedByName}${params.companySignedAt ? ` - ${formatDateInTz(params.companySignedAt, tz)}` : ""}`
              : "Not signed"
          )
        ),
        React.createElement(
          View,
          { style: { flex: 1 } },
          React.createElement(Text, { style: { fontSize: 8, color: params.accentColor, fontWeight: 700, marginBottom: 3 } }, "SIGNED BY CLIENT"),
          React.createElement(
            Text,
            { style: { fontSize: 11, fontWeight: 700, color: "#1a1a1a" } },
            params.signedByName
              ? `${params.signedByName}${params.signedAt ? ` - ${formatDateInTz(params.signedAt, tz)}` : ""}`
              : "Not signed"
          )
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
