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
EVERY <img> tag you write MUST include crossorigin="anonymous" as an attribute. The real images are served from a different domain than the app, and the flyer is rasterized to a canvas in the browser - without this attribute the browser refuses to let the canvas read the image and it renders as a blank white box. This is not optional.
${hasLogo ? '- Company logo: <img src="{{LOGO}}"> - use this small, once, in the header area' : "- No logo provided - use a text-based company name treatment instead"}
${hasBeforeAfter ? '- Before photo: <img src="{{BEFORE_PHOTO}}">\n- After photo: <img src="{{AFTER_PHOTO}}">\nDesign a clear before/after comparison section - these are real job-site photos, treat them as the visual centerpiece.' : ""}
${hasSinglePhoto ? '- Project photo: <img src="{{PROJECT_PHOTO}}"> - a real job-site photo, treat it as the visual centerpiece.' : ""}

DESIGN SYSTEM - consistent on every flyer, so all of a company's flyers read as one brand:
  - Color: the given accent color is the primary brand color and must be visibly dominant. Build the palette around it - one or two complementary/analogous shades plus a neutral (charcoal, navy, warm grey, or cream). Never substitute an unrelated palette.
  - Typography: at most 2 font families from the web-safe list. Establish a clear hierarchy - display headline, section headline, body, small caps for labels, and a distinct CTA treatment. Size contrast between levels must be obvious, not subtle.
  - Shapes: precise geometry only - true circles, straight lines, consistent corner radii. No wavy, blobby, or hand-drawn edges.
  - Spacing: consistent margins and generous whitespace. Whitespace is intentional - do not fill every gap. An uncrowded flyer reads as more expensive.
  - Logo: render with object-fit: contain, never cover, and never crop it into a circle or force it to fill a shape - that cuts off the mark and can leave a blank box.

  LAYOUT - pick the ONE that best fits this project's available material. Do not blend them:
  - HERO PROJECT: one large finished-result photo dominating the page, title over or beside it. Use when there is a single strong finished photo and no before shot.
  - BEFORE / AFTER: large paired comparison, clearly labeled. Use when transformation is the story and both photos exist.
  - PROJECT STORY: hero image, then a short narrative arc. Use when the project description carries a real story worth telling.
  - PROJECT SHOWCASE: hero image plus supporting images, scope of work, and CTA. Use when there are several usable photos.
  Choose deliberately based on what this specific project actually has. Different projects should produce genuinely different layouts.

  VISUAL HIERARCHY:
  - Exactly ONE dominant element per flyer. A viewer must understand what they are looking at within about two seconds.
  - Photography is the hero. Do not bury photos behind heavy gradients, filters, or overlays - subtle treatment only.

  MANDATORY ELEMENTS - all must appear, though their styling and placement are yours:
  1. Company identity (logo and/or name) with a short descriptor.
  2. The project photography, laid out per your chosen layout.
  3. A short professional summary of the work completed.
  4. A call to action with a visually distinct button-style element.
  5. A contact footer using the real phone/email/service area given to you.
  If the design runs long inside the fixed page, reduce padding, type sizes, or spacing - never drop a mandatory element to make things fit.

  COPY STANDARDS:
  - Write like an established construction firm, not a social media post. "Completed cedar privacy fence installation across the property's rear boundary" - NOT "Check out this awesome project!"
  - Use ONLY the facts provided. Never invent square footage, dollar amounts, durations, crew sizes, certifications, timelines, testimonials, or statistics. If a fact was not given to you, omit it entirely rather than estimating or inventing a plausible-sounding one.
  - Feature/benefit labels must be phrased naturally for the given trade type.

  FEATURE ICONS - if you include a feature/benefit row, each icon must literally depict its label's meaning: a shield or checkmark for quality/guarantee, crossed tools or a wrench for craftsmanship, a house outline for property value or curb appeal, a padlock for security, a clock for durability. Hand-build them with CSS shapes or inline SVG paths. Never use a generic unrelated shape (a plain star, triangle, or dollar sign) as filler - if you cannot draw an icon that clearly matches a label, choose a different label.

  SELF-CRITIQUE before you output - review your own design and fix what fails:
  - Is one element clearly dominant, or does everything compete?
  - Does any text overlap, clip, or run outside the page?
  - Are margins consistent and alignment clean?
  - Is the accent color unmistakably the dominant color?
  - Does every icon actually depict its label?
  - Are all five mandatory elements present?
  - Does this look like a professional construction firm produced it, or like a free template?
  Fix any failure before responding. Output only the corrected final HTML.`;

  const userPrompt = JSON.stringify({
    companyName: ctx.company.name,
    accentColor: ctx.company.brandAccentColor,
    tradeType: ctx.company.tradeType,
    companyPhone: ctx.company.businessPhone,
    companyEmail: ctx.company.businessEmail,
    serviceArea: ctx.company.serviceArea,
    projectDescription: latestPost ? latestPost.content.slice(0, 500) : null,
    projectCategory: job.category,
    projectCompletedOn: job.actualCompletionDate || job.endDate,
    projectStatus: job.status,
    hasLogo,
    hasBeforeAfterPhotos: hasBeforeAfter,
    hasSinglePhoto
  });

  try {
    let html = await askClaude(systemPrompt, userPrompt);
    // Strip any script tags as a safety net, even though the prompt already forbids them.
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Safety net: images come from cdn.taktco.org, a different origin than the
    // app, and the flyer is rasterized client-side via html2canvas. Without
    // crossorigin="anonymous" the browser won't let the canvas read those
    // pixels and every photo renders as a blank white box. The prompt asks the
    // AI to include it, but a silently blank flyer is too bad a failure to
    // leave to chance - force it on any <img> that's missing it.
    html = html.replace(/<img(?![^>]*\bcrossorigin=)/gi, '<img crossorigin="anonymous"');

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
