import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

const schema = z.object({
  status: z.enum(["SENT", "OPENED", "COMPLETED", "IGNORED"]),
  rating: z.number().min(1).max(5).optional(),
  content: z.string().optional()
});

// Marking COMPLETED with a rating also logs the actual Review record - keeps the
// two concepts (the ask, and what came back) separate but linked in one action.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  const request = await db.reviewRequest.findFirst({ where: { id: params.id, companyId: ctx.company.id }, include: { customer: true } });
  if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.reviewRequest.update({
    where: { id: request.id },
    data: { status: parsed.data.status, respondedAt: parsed.data.status === "COMPLETED" ? new Date() : undefined }
  });

  if (parsed.data.status === "COMPLETED" && parsed.data.rating) {
    await db.review.create({
      data: {
        companyId: ctx.company.id,
        customerId: request.customerId,
        platform: request.platform,
        rating: parsed.data.rating,
        content: parsed.data.content
      }
    });
    await notify({
      companyId: ctx.company.id,
      category: "REVIEW_RECEIVED",
      title: `${request.customer.name} left a ${parsed.data.rating}-star review`,
      body: parsed.data.content || undefined,
      linkUrl: `/customers/${request.customerId}`
    });
    await runTrigger(ctx.company.id, "REVIEW_RECEIVED", {
      companyId: ctx.company.id,
      customerId: request.customerId,
      trigger: "REVIEW_RECEIVED",
      rating: parsed.data.rating
    });
  }

  return NextResponse.json(updated);
}
