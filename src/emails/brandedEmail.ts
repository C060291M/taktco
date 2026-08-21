// Shared branded HTML wrapper for all transactional email - every send in the
// app should build its body with this so tenant branding (logo, accent color)
// is automatic rather than re-implemented per email type.
//
// Table-based layout (not divs) with inline styles and bgcolor fallback
// attributes, since Outlook desktop renders email using Word's engine, not
// a browser engine - it ignores flexbox, border-radius, and box-shadow
// entirely and can misrender div-based layouts. Tables render correctly
// everywhere. border-radius/box-shadow are left in as a progressive
// enhancement for Gmail/Apple Mail/etc - Outlook just shows square corners
// and no shadow instead of breaking.
export function brandedEmail(params: {
  companyName: string;
  logoUrl?: string | null;
  accentColor: string;
  heading: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const accent = params.accentColor || "#1EAEC4";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7" style="background:#f4f5f7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px; width:100%; background:#ffffff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="padding:28px 32px; border-bottom:3px solid ${accent};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${params.logoUrl ? `<td style="vertical-align:middle; padding-right:10px;"><img src="${params.logoUrl}" width="36" height="36" style="display:block; border-radius:6px;" alt="" /></td>` : ""}
                <td style="vertical-align:middle;">
                  <span style="font-family:Arial,Helvetica,sans-serif; color:#1a1a1a; font-weight:700; font-size:16px;">${params.companyName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="font-family:Arial,Helvetica,sans-serif; color:#1a1a1a; font-size:20px; font-weight:700; margin:0 0 14px 0;">${params.heading}</h1>
            <div style="font-family:Arial,Helvetica,sans-serif; color:#4a4a4a; font-size:14px; line-height:1.65;">${params.bodyHtml}</div>
            ${
              params.ctaUrl
                ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                     <tr>
                       <td bgcolor="${accent}" style="background:${accent}; border-radius:8px;">
                         <a href="${params.ctaUrl}" style="display:inline-block; font-family:Arial,Helvetica,sans-serif; color:#ffffff; font-weight:600; font-size:14px; padding:11px 24px; text-decoration:none;">${params.ctaLabel || "View"}</a>
                       </td>
                     </tr>
                   </table>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px; background:#fafafa; border-top:1px solid #eee;">
            <p style="font-family:Arial,Helvetica,sans-serif; color:#999; font-size:11px; margin:0;">Sent via TAKTCO on behalf of ${params.companyName}.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;
}
