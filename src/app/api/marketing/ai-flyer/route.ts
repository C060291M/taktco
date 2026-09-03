import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { askClaude } from "@/lib/ai";

// True AI-designed flyer - unlike the fixed-template generateFlyerPdf,
// this hands the AI a complete creative brief (trade type, contact info,
// project description, and where each image goes) and lets it design the
// actual HTML/CSS layout, palette, and typography itself. Rendered
// client-side via html2canvas + jsPDF - no server-side headless browser,
// so no Puppeteer-style deployment risk.
//
// IMPORTANT: actual image URLs (logo, photos) are NEVER sent to the AI in
// the prompt. In this environment they're often base64 data URIs (no
// object storage configured), which can run into the millions of
// characters - sent as prompt text that blows past any token limit
// instantly. Instead the AI writes placeholder tokens into its <img> src
// attributes, and those get swapped for the real URLs server-side after
// the AI responds, via plain string replacement - the AI never needs to
// see the actual image bytes to design a good layout around them.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });

  const job = await db.job.findFirst({
    where: { id: jobId, companyId: ctx.company.id },
    include: { photos: true, customer: true }
  });
  if (!job) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const beforePhoto = job.photos.find(function (p) { return p.type === "BEFORE"; });
  const afterPhoto = job.photos.find(function (p) { return p.type === "AFTER"; });
  const anyPhoto = job.photos[0];
  if (!beforePhoto && !afterPhoto && !anyPhoto) {
    return NextResponse.json({ error: "This project has no photos yet." }, { status: 400 });
  }

  const latestPost = await db.marketingContent.findFirst({
    where: { companyId: ctx.company.id, jobId: job.id },
    orderBy: { createdAt: "desc" }
  });

  const hasLogo = Boolean(ctx.company.logoUrl);
  const hasBeforeAfter = Boolean(beforePhoto && afterPhoto);
  const hasSinglePhoto = !hasBeforeAfter && Boolean(anyPhoto);

  const systemPrompt = `You are a professional graphic designer creating a single-page marketing flyer as a complete, self-contained HTML document.

HARD REQUIREMENTS:
- Output ONLY raw HTML starting with <!DOCTYPE html> - no markdown code fences, no explanation before or after.
- The whole document must be exactly one page sized 850px wide by 1100px tall (set this on the body or a root wrapper div, box-sizing: border-box).
- All CSS must be inline in a single <style> tag in the <head> - no external stylesheets, no external fonts, no JavaScript, no <script> tags of any kind.
- Only use the real facts given to you (company name, phone, email, service area, trade type, project description). Never invent a slogan, statistic, or claim that wasn't provided.
- Use web-safe fonts only (Arial, Helvetica, Georgia, Times New Roman, Verdana, Trebuchet MS) since custom font loading isn't available.

IMAGES - use these EXACT placeholder tokens as the src attribute of <img> tags, verbatim, with no modification. Real images will be substituted in after you respond, so you will never see the actual photos:
${hasLogo ? '- Company logo: <img src="{{LOGO}}"> - use this small, once, in the header area' : "- No logo provided - use a text-based company name treatment instead"}
${hasBeforeAfter ? '- Before photo: <img src="{{BEFORE_PHOTO}}">\n- After photo: <img src="{{AFTER_PHOTO}}">\nDesign a clear before/after comparison section - these are real job-site photos, treat them as the visual centerpiece.' : ""}
${hasSinglePhoto ? '- Project photo: <img src="{{PROJECT_PHOTO}}"> - a real job-site photo, treat it as the visual centerpiece.' : ""}

REQUIRED SECTIONS - every flyer must include all of these, though you choose how each looks:
  1. Header: company name/logo area plus a short tagline or descriptor.
  2. ${hasBeforeAfter ? 'Before/after comparison with a clear BEFORE and AFTER label on each photo' : 'A featured project photo section'}.
  3. A 3-4 item feature/benefit row using simple CSS-drawn icons or symbols (no external icon libraries, hand-built with CSS shapes or inline SVG paths) - each icon's shape must clearly and literally represent its label's meaning (e.g. a shield or checkmark for quality/guarantee, a wrench or crossed-tools shape for craftsmanship, a house outline for property value or curb appeal, a padlock for security or reliability, a clock for durability or longevity). Never use a generic, unrelated shape (a plain star, triangle, or dollar sign) just to fill a slot - if you cannot design an icon that clearly matches a chosen label, pick a different label whose meaning you can represent clearly. Phrase labels naturally for the given trade type. Do not invent specific certifications or claims not given to you.
  4. A call-to-action band with a visually distinct button-style element, e.g. "Get Your Free Quote".
  5. A footer with the real contact facts you were given (phone, email, service area) - omit any field that is null rather than inventing one.

  CREATIVE FREEDOM within that structure - and this is where you should push, not play it safe:
  - Color: the given accent color is the flyer's primary brand color and must be clearly recognizable as dominant throughout the design - never swap it for an unrelated palette. Build the rest of the palette AROUND it: one or two complementary or analogous colors (a deeper or lighter shade of the same hue, or a neutral like navy, charcoal, or cream) for contrast and hierarchy. Someone glancing at the flyer should immediately connect its colors to the brand's own accent color.
  - Shapes: every icon badge, border, and geometric element must be precise and clean - true circles (not ovals or blob shapes), straight lines, exact and consistent corner radii. No wavy, hand-drawn, or organic-looking edges anywhere.
  - Typography, composition, and overall visual concept are yours to choose freely within that palette and shape language.
  - Go bold: use strong type-scale contrast (a genuinely large, confident headline against much smaller supporting text), not everything sized similarly.
  - Add real visual depth - layered shadows, subtle overlays, angled or diagonal elements, full-bleed color blocks that run edge to edge - rather than flat, evenly-spaced boxes.
  - Aim for premium and punchy: bold color use and confident type, executed with precision - not sloppy, not timid.
  - Design something that looks like it came from a real professional design agency - confident, modern, and tailored to the specific trade.
  - Different flyers for different projects/trades should look meaningfully different from each other in color/style/icon choices, not like the same template with colors swapped.
  - You may use CSS gradients, shapes, borders, shadows, and creative layout techniques (flexbox/grid) freely.`;

  const userPrompt = JSON.stringify({
    companyName: ctx.company.name,
    accentColor: ctx.company.brandAccentColor,
    tradeType: ctx.company.tradeType,
    companyPhone: ctx.company.businessPhone,
    companyEmail: ctx.company.businessEmail,
    serviceArea: ctx.company.serviceArea,
    projectDescription: latestPost ? latestPost.content.slice(0, 500) : null,
    hasLogo,
    hasBeforeAfterPhotos: hasBeforeAfter,
    hasSinglePhoto
  });

  try {
    let html = await askClaude(systemPrompt, userPrompt);
    // Strip any script tags as a safety net, even though the prompt already forbids them.
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Swap the AI's placeholder tokens for the real (possibly very large
    // base64) image URLs - done here, never sent to the AI itself.
    if (hasLogo && ctx.company.logoUrl) html = html.split("{{LOGO}}").join(ctx.company.logoUrl);
    if (hasBeforeAfter) {
      html = html.split("{{BEFORE_PHOTO}}").join(beforePhoto!.url);
      html = html.split("{{AFTER_PHOTO}}").join(afterPhoto!.url);
    }
    if (hasSinglePhoto && anyPhoto) html = html.split("{{PROJECT_PHOTO}}").join(anyPhoto.url);

    return NextResponse.json({ html });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI flyer generation failed." }, { status: 500 });
  }
}
