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
  3. A 3-4 item feature/benefit row using simple CSS-drawn icons or symbols (no external icon libraries) - e.g. quality, craftsmanship, reliability, value - phrased naturally for the given trade type. Do not invent specific certifications or claims not given to you.
  4. A call-to-action band with a visually distinct button-style element, e.g. "Get Your Free Quote".
  5. A footer with the real contact facts you were given (phone, email, service area) - omit any field that is null rather than inventing one.

  CREATIVE FREEDOM within that structure:
  - You choose the layout, composition, color palette (the given accent color is a starting point/inspiration, not a rule - feel free to build a complementary palette around it), typography choices, icon styles, and overall visual concept for each of the five sections above.
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
