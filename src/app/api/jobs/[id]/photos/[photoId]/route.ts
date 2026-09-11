import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Per-photo operations: remove a photo, or replace its URL after the browser
// has rotated it.
//
// Rotation rewrites the actual image rather than storing a rotation flag. A
// flag would only work if every consumer honored it - the job page, the
// portfolio, the AI flyer, the fixed-template flyer, and the PDF generators -
// and missing one would put us right back to sideways photos in exactly the
// places that are hardest to notice. Rewriting the pixels fixes it everywhere
// at once, permanently.
//
// Deleting removes the database row. The underlying file is left in object
// storage rather than deleted, since storage is cheap and a hard delete risks
// removing a file still referenced elsewhere.
async function loadPhoto(companyId: string, jobId: string, photoId: string) {
  return db.jobPhoto.findFirst({
    where: { id: photoId, jobId, job: { companyId } }
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photo = await loadPhoto(ctx.company.id, params.id, params.photoId);
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  await db.jobPhoto.delete({ where: { id: photo.id } });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["BEFORE", "AFTER", "PROGRESS", "INSPECTION", "WARRANTY", "MISC"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid photo update." }, { status: 400 });

  const photo = await loadPhoto(ctx.company.id, params.id, params.photoId);
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const updated = await db.jobPhoto.update({
    where: { id: photo.id },
    data: {
      url: parsed.data.url,
      ...(parsed.data.type ? { type: parsed.data.type } : {})
    }
  });

  return NextResponse.json(updated);
}