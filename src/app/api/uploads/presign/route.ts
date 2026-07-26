import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createPresignedUploadUrl, storageConfigured } from "@/lib/storage";

const schema = z.object({
  kind: z.enum(["logos", "job-photos", "contracts", "documents"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!storageConfigured) {
    return NextResponse.json({ error: "Object storage not configured", configured: false }, { status: 501 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });

  const { uploadUrl, publicUrl, key } = await createPresignedUploadUrl({
    companyId: ctx.company.id,
    kind: parsed.data.kind,
    fileName: parsed.data.fileName,
    contentType: parsed.data.contentType
  });

  return NextResponse.json({ uploadUrl, publicUrl, key, configured: true });
}
