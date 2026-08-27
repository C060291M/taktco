import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { generateFlyerPdf } from "@/lib/generateFlyerPdf";

// Generates a downloadable Canva-style flyer PDF for a specific job's
// before/after photos - separate from the copy-paste social post text
// the main Marketing AI generator produces. Pulls the most recent
// generated post for this job (if any) as the flyer headline, falling
// back to a generic one otherwise.
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

  const headline = latestPost
    ? latestPost.content.split("\n")[0].replace(/^["']|["']$/g, "").slice(0, 140)
    : "Another project done right by " + ctx.company.name + "!";

  const pdfBuffer = await generateFlyerPdf({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    companyPhone: ctx.company.businessPhone,
    serviceArea: ctx.company.serviceArea,
    headline: headline,
    beforePhotoUrl: beforePhoto ? beforePhoto.url : null,
    afterPhotoUrl: afterPhoto ? afterPhoto.url : null,
    singlePhotoUrl: !beforePhoto && !afterPhoto && anyPhoto ? anyPhoto.url : null
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"flyer.pdf\""
    }
  });
}

