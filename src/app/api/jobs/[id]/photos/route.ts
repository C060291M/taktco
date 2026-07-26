import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  url: z.string(), // base64 data URL for now - same real-storage TODO as logos/contracts
  type: z.enum(["BEFORE", "AFTER", "PROGRESS", "INSPECTION", "WARRANTY", "MISC"]),
  caption: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid photo upload." }, { status: 400 });

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  const photo = await db.jobPhoto.create({
    data: {
      jobId: job.id,
      url: parsed.data.url,
      type: parsed.data.type,
      caption: parsed.data.caption,
      uploadedBy: ctx.user.id
    }
  });

  return NextResponse.json(photo, { status: 201 });
}
