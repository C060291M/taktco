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
  return `
    <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
        ${params.logoUrl ? `<img src="${params.logoUrl}" width="32" height="32" style="border-radius:6px;" />` : ""}
        <span style="color:#fff; font-weight:600; font-size:16px;">${params.companyName}</span>
      </div>
      <h1 style="color:#fff; font-size:20px; margin-bottom:12px;">${params.heading}</h1>
      <div style="color:#B4B8BF; font-size:14px; line-height:1.6;">${params.bodyHtml}</div>
      ${
        params.ctaUrl
          ? `<a href="${params.ctaUrl}" style="display:inline-block; margin-top:20px; background:${params.accentColor}; color:#0E0F11; font-weight:600; padding:10px 20px; border-radius:8px; text-decoration:none;">${params.ctaLabel || "View"}</a>`
          : ""
      }
      <p style="color:#5B6069; font-size:11px; margin-top:32px;">Sent via TAKTCO on behalf of ${params.companyName}.</p>
    </div>
  `;
}
