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
// Fetches an image server-side and returns it as a base64 data URI.
//
// Why: photos and logos live on cdn.taktco.org, a different origin than the
// app. The flyer is rasterized in the browser via html2canvas, and a canvas
// cannot read cross-origin pixels unless the CDN's CORS preflight cooperates -
// which, in practice, it did not. Rather than keep negotiating with CORS,
// the server fetches the bytes and inlines them, so the browser makes no
// cross-origin image request at all and there is nothing to block.
//
// This runs AFTER the AI has responded. The AI still only ever sees
// {{LOGO}} / {{BEFORE_PHOTO}} placeholder tokens, never image data - the
// enormous-prompt problem that motivated the token design stays solved.
//
// Already-inlined base64 URLs (uploads from before object storage existed)
// are passed straight through. A fetch failure returns null so the caller can
// fall back to the raw URL rather than dropping the image entirely.
// Relative luminance, used to decide whether text on a given background
// should be near-white or near-black. Standard sRGB coefficients.
function luminanceOf(hex: string): number {
  const clean = (hex || "").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(function (ch) { return ch + ch; }).join("") : clean;
  if (full.length !== 6) return 0.5;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Builds the shell the AI's markup is dropped into. Canvas background and
// every text color are decided HERE, not by the model - repeated attempts to
// enforce contrast through prompt instructions alone produced invisible
// paragraphs and pale-on-white headings. The model still owns layout,
// typography, imagery, and composition; it just cannot choose a text color
// that can't be read, drift the canvas mid-page, or omit the contact footer.
function buildFlyerShell(params: {
  inner: string;
  canvas: "light" | "dark";
  accent: string;
  companyName: string;
  phone: string | null;
  email: string | null;
  serviceArea: string | null;
}) {
  const isDark = params.canvas === "dark";
  const canvasColor = isDark ? "#101820" : "#ffffff";
  const ink = isDark ? "#e8edf2" : "#1a1f26";
  const inkStrong = isDark ? "#ffffff" : "#0d1117";
  const inkMuted = isDark ? "#a9b6c3" : "#4a5560";
  const accentInk = luminanceOf(params.accent) > 0.55 ? "#101820" : "#ffffff";
  const footerBg = isDark ? "#0a1016" : "#f2f4f6";
  const footerBorder = isDark ? "#1f2c38" : "#dfe4e9";

  const contactBits: string[] = [];
  if (params.phone) contactBits.push(`<span style="color:${inkStrong};font-weight:700">${params.phone}</span>`);
  if (params.email) contactBits.push(`<span style="color:${ink}">${params.email}</span>`);
  if (params.serviceArea) contactBits.push(`<span style="color:${ink}">${params.serviceArea}</span>`);

  const footer = contactBits.length
    ? `<div style="background:${footerBg};border-top:3px solid ${params.accent};padding:20px 44px;display:flex;align-items:center;justify-content:space-between;gap:20px;font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:0.3px">
        <span style="color:${inkStrong};font-weight:700;letter-spacing:1px;text-transform:uppercase">${params.companyName}</span>
        <span style="display:flex;gap:22px;align-items:center">${contactBits.join('<span style="color:' + inkMuted + '">|</span>')}</span>
      </div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root{
      --canvas:${canvasColor};
      --ink:${ink};
      --ink-strong:${inkStrong};
      --ink-muted:${inkMuted};
      --accent:${params.accent};
      --accent-ink:${accentInk};
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:850px;height:1100px;background:var(--canvas);color:var(--ink);
         font-family:Helvetica,Arial,sans-serif;overflow:hidden;
         display:flex;flex-direction:column}
    #flyer-body{flex:1;min-height:0;overflow:hidden}
    /* Text color is enforced, not suggested. Given the CSS variables as
       guidance the model still wrote its own pale greys and creams, producing
       body copy and labels that were invisible against the canvas. These
       !important rules override whatever color it sets, so the AI keeps full
       control of layout, type, and composition but cannot make text
       unreadable. Elements sitting on an accent fill opt out by carrying the
       .on-accent class. */
    #flyer-body, #flyer-body *{color:var(--ink) !important}
    #flyer-body h1,#flyer-body h2,#flyer-body h3,#flyer-body h4,
    #flyer-body strong,#flyer-body b{color:var(--ink-strong) !important}
    #flyer-body .on-accent,#flyer-body .on-accent *{color:var(--accent-ink) !important}
    /* Any element the AI fills with the accent color gets readable text
       automatically, without needing to remember the helper class. */
    #flyer-body [style*="--accent"],#flyer-body [style*="--accent"] *{color:var(--accent-ink) !important}
    #flyer-body svg{color:inherit}
    img{display:block;max-width:100%}
  </style></head><body>
    ${params.inner}
    ${footer}
  </body></html>`;
}

async function toDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

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

STRUCTURE - you are filling in a fixed shell, not writing the whole document. This exists because the same failures kept recurring: unreadable body text, canvases drifting mid-page, and a missing contact footer. Those parts are now handled for you.

Write your flyer as the contents of a single <div id="flyer-body">, nothing more - no <!DOCTYPE>, <html>, <head>, or <body> tags. Wrap it exactly like this:

<div id="flyer-body">
  ...your design here...
</div>

These CSS custom properties are already defined and MUST be used instead of hardcoding equivalents:
  var(--canvas)      the page background - already applied, do not override it on section wrappers
  var(--ink)         body text color, guaranteed readable on the canvas
  var(--ink-strong)  heading text color, guaranteed readable on the canvas
  var(--ink-muted)   secondary text - still readable, use sparingly for labels
  var(--accent)      the company's brand color
  var(--accent-ink)  text color guaranteed readable ON an accent-colored background

Rules for using them:
  - All body copy and headings use var(--ink) / var(--ink-strong). Never write a literal color, tint, grey, or cream for text on the canvas - that is what produced invisible paragraphs.
  - Any element you fill with var(--accent) must ALSO carry class="on-accent" so its text switches to the readable color for that fill. Do not set text color yourself - the shell enforces it either way, and a color you write will simply be overridden.
  - Do not set a background on section wrappers unless it is var(--accent) or a photo. The canvas shows through, which keeps the whole flyer on one background automatically.
  - State at the top of your CSS, in a comment, whether you designed for a light or dark canvas.

Tell us which canvas you chose by making the FIRST LINE of your entire response exactly "CANVAS: light" or "CANVAS: dark", then a newline, then the <div>. Nothing else before it.

A contact footer with the company's real phone, email, and service area is appended automatically after your div. Do NOT write your own contact footer - it would duplicate. You SHOULD still include a call-to-action band above it.

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

  PRODUCTION QUALITY - this is what separates a flyer a contractor is proud to hand out from one that looks auto-generated. Apply all of it:
  - Canvas: choose ONE treatment - light or dark - used by every section of the flyer, based on what suits this company's brand color and photography. A dark canvas (deep charcoal, near-black, or a very dark shade of the brand hue) makes photos and accent color pop and generally reads more premium - prefer it unless the brand color is dark enough that it would disappear against it. Either way, the palette must derive from the company's own accent color, never a generic default.
  - Headline: genuinely large and dominant - the single biggest thing on the page by a wide margin. A timid headline is the most common way these flyers look cheap. Two-tone headlines (one line in the neutral, one in the accent) read as deliberate design.
  - Photography: run photos edge-to-edge or full-bleed within their section rather than floating them in small boxes with wide margins. The photos are the product; give them the room.
  - Depth: include exactly one element that overlaps or breaks a boundary - a badge over a photo seam, a card straddling two sections, a label overlapping an image edge. One is confident; several is cluttered.
  - Feature cells: give each feature both a short bold label AND a brief supporting line beneath it. Labels alone read thin. Group them in a bounded panel or separate them with thin dividers rather than leaving them floating.
  - Footer: build it as two or three distinct horizontal bands (call-to-action band, then contact details, optionally a short closing tagline strip) rather than one undifferentiated block. Bands create rhythm.

  CONTRAST - non-negotiable, and the most damaging thing to get wrong. A flyer whose text cannot be read is worthless no matter how well composed it is:
  - Every piece of text must be strongly readable against the exact background it actually sits on. Light text belongs only on dark backgrounds; dark text only on light backgrounds.
  - COMMIT TO ONE CANVAS FOR THE ENTIRE FLYER. Choose light or dark once, at the start, and use that single canvas as the background for every content section. Do NOT mix a dark header with a white body and a cream panel - mixing backgrounds is what causes a text color chosen for one section to be reused on another where it becomes invisible, and it has produced unreadable flyers repeatedly. One background, one set of text colors, applied throughout.
  - Accent-colored bands (a CTA strip, a label, a footer band) are the ONE permitted exception - they may differ from the canvas, but text on them must be explicitly colored for that band, never inherited from the canvas.
  - Having committed to a canvas, define your text colors once: on a dark canvas, near-white for body and headlines; on a light canvas, a deep neutral. Use those same colors throughout. Never introduce a cream, tint, or pale color for text on a light canvas.
  - Never place body text directly over a photograph unless it sits on a solid or heavily darkened panel.
  - Headlines are not exempt. A large headline in a barely-different shade of its background is invisible, not subtle.
  - Before finishing, walk through every text element and name the background behind it. Fix any light-on-light or dark-on-dark pairing.
  - Body copy must be at FULL strength - a deep neutral on a light canvas, or near-white on a dark one. Never render body text in a faded grey, a tint of the background, or at reduced opacity. "Soft" body copy is the single most common way these flyers become hard to read. Opacity below 1 is not permitted on any text.
  - Nothing may cross or clip type. Headlines especially must sit entirely within their own band with clear space around them - never let a photo, color block, or section edge cut through a letterform or its descenders.

  ICONOGRAPHY - every feature cell needs a hand-built icon above its label (inline SVG or CSS shapes), and each icon must literally depict its label's meaning. A cell with an empty gap where an icon should be looks unfinished. Draw them at a size that reads clearly, in a color with strong contrast against the cell behind it.

  COMPOSITION - the difference between a designed piece and a stack of blocks. Stacking full-width horizontal strips of roughly equal weight is what makes a flyer look auto-generated, and it is the main thing to avoid:
  - Do not run every element edge-to-edge. Establish a consistent page margin and let most content sit inside it. Reserve true full-bleed for ONE deliberate moment - typically the hero photograph or a single color band - so that when something does break the margin it reads as intentional.
  - Vary the weight and rhythm of sections. Some should be tall and dominant, others compressed. Six sections of similar height stacked vertically is the failure pattern.
  - Not everything needs to be a full-width row. Use side-by-side arrangements where they suit the content: a headline beside the badge, contact details in columns, an icon paired with CTA text, a vertical divider rule separating a logo from a tagline.
  - Give a headline real clearance. Nothing - photo, band, or panel - may sit flush against a headline's baseline; leave clear vertical space beneath it so descenders are never clipped.

  TYPOGRAPHY CRAFT:
  - Prefer ONE family used across a wide range of weights and sizes over two mismatched families. A single sans at 900 weight for the headline, 700 for labels, and 400 for body reads more designed than a serif headline paired with a default-looking body font.
  - Use letter-spacing deliberately: tightened on large headlines, widened on small uppercase labels. Untracked type is what makes text look unstyled.

  DEPTH AND DETAIL - flat fills alone read cheap. Add restrained richness:
  - Use a subtle gradient or tonal shift within large dark fields rather than one flat color.
  - Add fine accent-colored hairlines or short rules as separators and accents.
  - Small graphic details earn their place: a directional arrow in a button, a thin rule under a section label, a shaped badge rather than a plain rectangle, a repeated motif drawn from the trade.
  - Keep every one of these subtle. The goal is a piece that rewards a second look, not one crowded with ornament.

  BORDERS AND FRAMING - be assertive, not tentative:
  - Where you use borders, dividers, rules, or frames, make them substantial enough to read as a deliberate design choice - a confident 3-6px accent rule, a solid framed panel, a heavy top border on a section. Hairline 1px greys look like an unstyled default.
  - Photos benefit from a decisive edge: a thick accent border, a solid color block behind them, or a hard-cropped full-bleed edge. Avoid soft, barely-there outlines.
  - Section transitions should be obvious - a color band, a heavy rule, or a clear change of background - rather than relying on whitespace alone to separate everything.

  CREATIVE RANGE - two flyers from the same company should be recognizably the same brand but visibly different pieces of design:
  - Vary the composition meaningfully between projects: where the headline sits, whether the photo leads or follows, horizontal versus vertical splits, asymmetric versus centered arrangements, diagonal color blocks, oversized numerals or trade-relevant graphic elements.
  - Take a real design position rather than defaulting to a safe stack of centered rows. A flyer that could have been produced by filling in a template has failed even if nothing about it is technically wrong.
  - Push harder than feels necessary on scale contrast and color blocking; restraint reads as blandness at this size.
  - Commit to a strong visual idea for each flyer rather than arranging safe rows: a full-bleed photo with the headline reversed out of a solid block over it, a bold split down the page, an oversized accent shape anchoring a corner, a heavy color band carrying the headline. Pick one organizing idea and execute it decisively.
  - Contrast is a creative tool, not just a legibility rule - deep darks against bright accents, big against small, dense against open. Timid, evenly-toned flyers are the failure mode to avoid.

  LAYOUT SAFETY - the previous version of this flyer had the footer render on top of the content above it, cutting text in half:
  - Everything must sit in normal document flow. Do NOT use position: absolute or position: fixed for the footer, CTA, or any section-level block. Absolute positioning is permitted ONLY for the single overlapping accent element described above.
  - No element may cover, clip, or overlap another element's text. The one intentional overlap must sit over a photo or empty space, never over type.
  - The full page content must fit within the fixed height. Budget vertical space across your sections BEFORE writing them - header, photo, summary, features, and footer must all fit, with the final element ending above the bottom edge. If it runs long, shrink the photo section first, then padding, then type sizes. A CTA or footer sliced off by the page edge is a failed flyer.

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
  - Does the footer or CTA sit on top of the content above it, or run past the bottom edge?
  - Is the SAME canvas background used by every content section, or did sections drift between light and dark?
  - Name the background behind every text element - is any of it light-on-light or dark-on-dark?
  - Are the phone, email, and service area actually present in the footer? (A recent build dropped them entirely.)
  - Do the borders and section transitions look deliberate, or like unstyled defaults?
  - Is any body copy faded, greyed, or below full opacity? Restore it to full strength.
  - Does any photo, band, or edge cut through a headline or its descenders, or sit flush against its baseline?
  - Is this a stack of similar full-width strips, or a composed page with margins, varied section weight, and at least one side-by-side arrangement?
  - Would a commercial client believe a design agency produced this, or does it look generated?
  - Does every feature cell actually have its icon drawn, or is there an empty gap?
  - Is the headline unmistakably the largest element, or does it merely blend in?
  - Do the photos feel generous and full-bleed, or cramped inside boxes?
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
    let raw = await askClaude(systemPrompt, userPrompt);

    // The model declares its canvas choice on the first line, then returns the
    // inner markup. Strip that line off and use it to build the shell.
    let canvas: "light" | "dark" = "dark";
    const canvasMatch = raw.match(/^\s*CANVAS:\s*(light|dark)\s*$/im);
    if (canvasMatch) {
      canvas = canvasMatch[1].toLowerCase() === "light" ? "light" : "dark";
      raw = raw.replace(canvasMatch[0], "");
    }

    // Defensive: if the model ignored the contract and returned a full
    // document anyway, salvage just the flyer div so the shell still applies.
    const innerMatch = raw.match(/<div[^>]*id=["']flyer-body["'][\s\S]*<\/div>/i);
    const inner = innerMatch ? innerMatch[0] : `<div id="flyer-body">${raw}</div>`;

    let html = buildFlyerShell({
      inner,
      canvas,
      accent: ctx.company.brandAccentColor,
      companyName: ctx.company.name,
      phone: ctx.company.businessPhone,
      email: ctx.company.businessEmail,
      serviceArea: ctx.company.serviceArea
    });
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
    if (hasLogo && ctx.company.logoUrl) {
      const logoData = await toDataUri(ctx.company.logoUrl);
      html = html.split("{{LOGO}}").join(logoData || ctx.company.logoUrl);
    }
    if (hasBeforeAfter) {
      const beforeData = await toDataUri(beforePhoto!.url);
      html = html.split("{{BEFORE_PHOTO}}").join(beforeData || beforePhoto!.url);
      const afterData = await toDataUri(afterPhoto!.url);
      html = html.split("{{AFTER_PHOTO}}").join(afterData || afterPhoto!.url);
    }
    if (hasSinglePhoto && anyPhoto) {
      const photoData = await toDataUri(anyPhoto.url);
      html = html.split("{{PROJECT_PHOTO}}").join(photoData || anyPhoto.url);
    }

    return NextResponse.json({ html });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI flyer generation failed." }, { status: 500 });
  }
}
