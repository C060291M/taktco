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
  // A panel is a subtly raised surface on the canvas - slightly lighter on a
  // dark canvas, slightly darker on a light one - with text computed for it.
  const panel = isDark ? "#18222c" : "#f4f6f8";
  const panelInk = isDark ? "#e8edf2" : "#1a1f26";
  // A deliberate dark block, available on either canvas, for footer bands,
  // photo captions, or a high-contrast section.
  const dark = "#0d141b";
  const darkInk = "#f2f5f8";
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
      --panel:${panel};
      --panel-ink:${panelInk};
      --dark:${dark};
      --dark-ink:${darkInk};
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:850px;height:1100px;background:var(--canvas);color:var(--ink);
         font-family:Helvetica,Arial,sans-serif;overflow:hidden;
         display:flex;flex-direction:column}
    #flyer-body{flex:1;min-height:0;overflow:hidden}
    /* SURFACE PAIRS.
       Earlier versions enforced a single text color across the whole flyer,
       which only works while everything sits on the page background. As soon
       as the AI put a panel, card, or band on top, the shell had no idea what
       color that surface was and forced the canvas's text color onto it -
       invisible whenever the two differed. On a dark canvas the mismatch
       happened to be harmless; on a light one it wiped out headlines and body
       copy repeatedly.
       Each class below sets a background AND its correct text color together,
       computed server-side. The AI chooses which surface to use where, but
       cannot separate a background from the text color that belongs with it,
       so unreadable combinations are not expressible. */
    #flyer-body,#flyer-body *{color:var(--ink) !important}

    #flyer-body .surface-canvas{background:var(--canvas) !important;color:var(--ink) !important}
    #flyer-body .surface-canvas *{color:inherit !important}

    #flyer-body .surface-panel{background:var(--panel) !important;color:var(--panel-ink) !important}
    #flyer-body .surface-panel *{color:inherit !important}

    #flyer-body .surface-accent{background:var(--accent) !important;color:var(--accent-ink) !important}
    #flyer-body .surface-accent *{color:inherit !important}

    #flyer-body .surface-dark{background:var(--dark) !important;color:var(--dark-ink) !important}
    #flyer-body .surface-dark *{color:inherit !important}

    /* Default text color for everything, applied FIRST and with !important so
       it beats any color the AI writes inline. The surface classes below it in
       the cascade are equally !important but more specific, so a classified
       surface still wins for its own subtree. The previous version of this
       tried to exclude surfaces with a chain of :not() selectors containing
       descendant combinators, which browsers do not reliably support - the
       whole rule failed to parse and was dropped, leaving unclassified
       headlines and body copy with whatever pale color the model chose. */

    #flyer-body,#flyer-body *{opacity:1 !important}
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

  // Supporting shots: everything not already used as the before/after pair or
  // the single hero. Projects often have several usable photos, and until now
  // the flyer only ever used one or two of them - the rest were uploaded and
  // then ignored. Capped at three so the prompt stays small and the page does
  // not turn into a contact sheet.
  const usedIds = new Set(
    [hasBeforeAfter ? beforePhoto?.id : null, hasBeforeAfter ? afterPhoto?.id : null, hasSinglePhoto ? anyPhoto?.id : null].filter(Boolean)
  );
  const supportingPhotos = job.photos
    .filter(function (p) { return !usedIds.has(p.id); })
    .slice(0, 3);

  const systemPrompt = `You are a senior graphic designer at a construction marketing agency. Design a single-page project flyer a contractor would be proud to hand a commercial client.

OUTPUT FORMAT:
- First line of your response: exactly "CANVAS: light" or "CANVAS: dark" - your choice, based on what suits this company's brand color and photography. Dark usually looks more premium.
- Then your design, wrapped in a div with EXACTLY this opening tag - copy it character for character, the id is required and the whole flyer breaks without it:

<div id="flyer-body" style="display:flex;flex-direction:column;height:100%">
  ...your design...
</div>

  Nothing before or after that div. No <!DOCTYPE>, <html>, <head>, or <body>.
- Put all CSS in inline style attributes. No <style> tag, no external stylesheets, no fonts, no JavaScript.
- Web-safe fonts only: Arial, Helvetica, Georgia, Times New Roman, Verdana, Trebuchet MS.
- The page is 850px wide by 1100px tall. A contact footer is appended automatically below your div - budget roughly 70px for it, and do not write your own.

COLOR - use surface classes, never write colors yourself:

Every element that has a background must carry exactly one of these classes. Each one applies a background AND the text color that belongs with it, already computed to be readable:

  class="surface-canvas"  the page background - the default, for open areas
  class="surface-panel"   a subtly raised panel - for feature cards, summary blocks, grouped content
  class="surface-accent"  filled with the company's brand color - for CTA bands, badges, labels
  class="surface-dark"    a deliberate dark block - for high-contrast bands or photo captions

Rules:
  - NEVER set color or background-color yourself. Not on a div, not on a heading, not on a span. Use the classes.
  - An element with no surface class inherits the canvas background and its text color, which is correct for most content.
  - Borders, shadows, spacing, radii, gradients on photos, sizing and layout are all yours - only background and text color are managed.
  - var(--accent) is available if you need the brand color for a border or a rule, but never for a background or text color; use surface-accent for that.

${hasBeforeAfter ? 'This project has before and after photos - a transformation comparison should be the centerpiece.' : 'This project has one photograph - make it a large hero image.'}

WHAT TO INCLUDE:
- Company identity with the logo
- The photography, given real prominence

IMAGES - you never see the actual photos. Reference them with these exact placeholder tokens as the src of an <img> tag, verbatim. Real image data is substituted in after you respond. Do NOT draw colored divs or gradient boxes as stand-ins for photos - use the tokens or there will be no photography on the flyer:
${hasLogo ? '  <img src="{{LOGO}}"> - the company logo, small, in the header. Use object-fit: contain and never crop it into a shape.' : "  No logo available - use a text treatment of the company name instead."}
${hasBeforeAfter ? '  <img src="{{BEFORE_PHOTO}}"> and <img src="{{AFTER_PHOTO}}"> - real job-site photos. Give them size; they are the centerpiece.' : ""}
${hasSinglePhoto ? '  <img src="{{PROJECT_PHOTO}}"> - a real job-site photo. Make it a large hero image.' : ""}
${supportingPhotos.length > 0 ? `  Supporting shots you may also use: ${supportingPhotos.map(function (_p, i) { return "{{PHOTO_" + (i + 1) + "}}"; }).join(", ")} - additional real job-site photos. Use them as smaller secondary images (a strip, a grid, or a detail shot) to fill the page, NOT at the same size as the main imagery. Skip any you don't have room for.` : ""}
Every <img> must include crossorigin="anonymous". Give each one explicit width/height or object-fit styling so it fills its container properly.
- A headline with actual substance - a phrase, not a single orphaned word
- A short professional summary of the work (2-3 sentences, written like an established firm, never "check out this awesome project")
- 3-4 feature/benefit cells, each with a hand-drawn inline-SVG icon that literally depicts its label, plus a short supporting line
- A call-to-action band with a button-style element

QUALITY BAR:
- Fill the page. Empty space that reads as unfinished rather than intentional is the most common failure - every region of the flyer should be doing something.
- One element should clearly dominate. Vary section heights; do not stack same-sized strips.
- Use only the facts given. Never invent measurements, prices, durations, crew sizes, certifications, or testimonials.
- Make it look designed: decisive borders, strong type-scale contrast, one deliberate overlapping accent element, full-bleed photography.
- Nothing may overlap or clip text, and nothing may extend past the page.`;

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
    // Locked to dark. Light canvases repeatedly rendered unreadable text on
    // elements without a surface class - the company name, headline, and
    // summary - and eight attempts at enforcing color via CSS, specificity,
    // opacity, and stripping inline styles never reliably fixed it. Dark has
    // been consistently correct throughout, so the choice is removed rather
    // than shipping a generator that produces an unusable flyer some of the
    // time. The CANVAS line is still parsed and discarded so the prompt
    // contract stays intact; revisit light once the root cause is known.
    const canvas: "light" | "dark" = "dark";
    const canvasMatch = raw.match(/^\s*CANVAS:\s*(light|dark)\s*$/im);
    if (canvasMatch) {
      raw = raw.replace(canvasMatch[0], "");
    }

    // Defensive: if the model ignored the contract and returned a full
    // document anyway, salvage just the flyer div so the shell still applies.
    const innerMatch = raw.match(/<div[^>]*id=["']flyer-body["'][\s\S]*<\/div>/i);
    if (!innerMatch) {
      // Without the wrapper div none of the shell's contrast enforcement or
      // flex layout applies, which renders as pale unreadable text and a
      // footer floating mid-page. Log loudly rather than shipping a broken
      // flyer that looks like a design problem.
      console.error("[ai-flyer] model did not return a #flyer-body div. First 500 chars:", raw.slice(0, 500));
    }
    // Temporary diagnostic: text keeps rendering washed out on light canvases
    // despite the shell's !important color rules, which should be impossible
    // if the AI's markup is really inside #flyer-body. Log a sample of what it
    // actually returned so this can be read from the deploy logs instead of
    // inferred from the rendered PDF. Remove once the cause is confirmed.
    

    let inner = innerMatch
      ? innerMatch[0]
      : `<div id="flyer-body" style="display:flex;flex-direction:column;height:100%">${raw}</div>`;

    // Strip color and background declarations out of the AI's inline styles.
    //
    // Repeated rounds of CSS enforcement failed to keep text readable because
    // an inline style outranks any stylesheet rule - no selector is specific
    // enough to beat it. Rather than keep fighting the cascade, the competing
    // declarations are removed outright: with no inline color present, the
    // shell's surface classes are the only thing setting text color, which is
    // what they were designed to be.
    //
    // Only color and background are stripped. Everything else the AI writes -
    // layout, spacing, sizing, borders, radii, shadows, gradients, flex rules -
    // is left untouched.
    // Any <style> block the model emits sits inside #flyer-body and its rules
    // can beat the shell's, so remove those wholesale before anything else.
    inner = inner.replace(/<style[\s\S]*?<\/style>/gi, "");

    // Handles both double- and single-quoted style attributes; an earlier
    // version only matched double quotes, which let single-quoted colors
    // through and kept producing washed-out text on light canvases.
    inner = inner.replace(/style\s*=\s*(["'])([\s\S]*?)\1/gi, function (_match, quote, styles) {
      const cleaned = String(styles)
        .split(";")
        .filter(function (decl) {
          const prop = decl.split(":")[0].trim().toLowerCase();
          return prop !== "color" && prop !== "background-color" && prop !== "background";
        })
        .join(";");
      return `style=${quote}${cleaned}${quote}`;
    });

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

    // Supporting shots. Any token the AI chose not to use is stripped along
    // with its surrounding <img> tag, so an unused placeholder never renders
    // as a broken image.
    for (let i = 0; i < supportingPhotos.length; i++) {
      const token = `{{PHOTO_${i + 1}}}`;
      const photo = supportingPhotos[i];
      const data = await toDataUri(photo.url);
      html = html.split(token).join(data || photo.url);
    }

    // The AI is told it may skip supporting shots it has no room for, so any
    // token left unreplaced would otherwise render as literal text. Remove the
    // whole <img> tag rather than just the token, which would leave a broken
    // image icon behind.
    html = html.replace(/<img[^>]*\{\{PHOTO_\d+\}\}[^>]*>/gi, "");

    return NextResponse.json({ html });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI flyer generation failed." }, { status: 500 });
  }
}