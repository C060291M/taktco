// Shared branded HTML wrapper for all transactional email - every send in the
// app should build its body with this so tenant branding (logo, accent color)
// is automatic rather than re-implemented per email type.
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
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f4f5f7; padding:32px 16px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div style="padding:28px 32px; border-bottom:3px solid ${accent};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                ${params.logoUrl ? `<img src="${params.logoUrl}" width="36" height="36" style="border-radius:6px; vertical-align:middle; margin-right:10px;" />` : ""}
                <span style="color:#1a1a1a; font-weight:700; font-size:16px; vertical-align:middle;">${params.companyName}</span>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:32px;">
          <h1 style="color:#1a1a1a; font-size:20px; font-weight:700; margin:0 0 14px 0;">${params.heading}</h1>
          <div style="color:#4a4a4a; font-size:14px; line-height:1.65;">${params.bodyHtml}</div>
          ${
            params.ctaUrl
              ? `<a href="${params.ctaUrl}" style="display:inline-block; margin-top:22px; background:${accent}; color:#ffffff; font-weight:600; font-size:14px; padding:11px 24px; border-radius:8px; text-decoration:none;">${params.ctaLabel || "View"}</a>`
              : ""
          }
        </div>
        <div style="padding:18px 32px; background:#fafafa; border-top:1px solid #eee;">
          <p style="color:#999; font-size:11px; margin:0;">Sent via TAKTCO on behalf of ${params.companyName}.</p>
        </div>
      </div>
    </div>
  `;
}
