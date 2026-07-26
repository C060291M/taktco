import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  url: z.string(),
  fileName: z.string(),
  fileType: z.string().optional()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid attachment." }, { status: 400 });

  const attachment = await db.attachment.create({
    data: {
      companyId: ctx.company.id,
      customerId: parsed.data.customerId,
      leadId: parsed.data.leadId,
      url: parsed.data.url,
      fileName: parsed.data.fileName,
      fileType: parsed.data.fileType,
      uploadedById: ctx.user.id
    }
  });

  return NextResponse.json(attachment, { status: 201 });
}
