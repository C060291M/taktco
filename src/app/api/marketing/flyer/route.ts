import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateFlyerPdf } from "@/lib/generateFlyerPdf";

// Generates a downloadable Canva-style flyer PDF for a specific job's
// before/after photos - separate from the copy-paste social post text
// the main Marketing AI generator produces. Pulls the most recent
// generated post for this job (if any) as the flyer headline, falling
// back to a generic one otherwise.
function cleanHeadline(raw: string, maxLen: number): string {
  // Strip emoji/non-ASCII - the PDF font (Helvetica) has no emoji glyphs
  // and renders them as corrupted characters.
  let text = raw.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  // Truncate at the last full word inside the limit, not mid-word.
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "...";
}

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });

  const job = await db.job.findFirst({
    where: { id: jobId, companyId: ctx.company.id },
    include: { photos: true }
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

  const rawHeadline = latestPost
    ? latestPost.content.split("\n")[0].replace(/^["']|["']$/g, "")
    : "Another project done right by " + ctx.company.name + "!";
  const headline = cleanHeadline(rawHeadline, 140);

  const pdfBuffer = await generateFlyerPdf({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    companyPhone: ctx.company.businessPhone,
    companyEmail: ctx.company.businessEmail,
    serviceArea: ctx.company.serviceArea,
    tradeType: ctx.company.tradeType,
    headline: headline,
    beforePhotoUrl: beforePhoto ? beforePhoto.url : null,
    afterPhotoUrl: afterPhoto ? afterPhoto.url : null,
    singlePhotoUrl: !beforePhoto && !afterPhoto && anyPhoto ? anyPhoto.url : null
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"flyer.pdf\"",
      "Cache-Control": "no-store"
    }
  });
}

