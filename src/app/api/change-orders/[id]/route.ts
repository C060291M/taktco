import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["DRAFT", "SENT", "APPROVED", "DECLINED"]),
  signedByName: z.string().min(1).optional()
});

// Approving a change order moves its amount into the job's quoted cost, matching
// the "automatically update project totals" requirement - this is the one thing a
// generic Contract record shouldn't do, which is why change orders are a separate model.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  if (parsed.data.status === "APPROVED" && !parsed.data.signedByName) {
    return NextResponse.json({ error: "Type a name to approve." }, { status: 400 });
  }

  const changeOrder = await db.changeOrder.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!changeOrder) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.changeOrder.update({
    where: { id: changeOrder.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "APPROVED" ? { signedByName: parsed.data.signedByName, signedAt: new Date() } : {})
    }
  });

  if (parsed.data.status === "APPROVED" && changeOrder.status !== "APPROVED") {
    await db.job.update({
      where: { id: changeOrder.jobId },
      data: { quotedCost: { increment: changeOrder.amountDelta } }
    });
  }

  return NextResponse.json(updated);
}
