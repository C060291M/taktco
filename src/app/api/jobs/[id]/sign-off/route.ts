import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { notify } from "@/lib/notify";

// A Field Tech's own completion flag - deliberately separate from Job.status.
// It does NOT auto-complete the job; office staff still review the work and
// move status to COMPLETE themselves. Anyone assigned to the job can sign
// off, not just Field Techs, in case an Admin/Owner is also doing field work.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await db.job.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null }, include: { customer: true } });
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await db.job.update({
    where: { id: job.id },
    data: { techSignedOffByName: ctx.user.name, techSignedOffAt: new Date() }
  });

  await notify({
    companyId: ctx.company.id,
    category: "PROJECT_STATUS_CHANGED",
    title: ctx.user.name + " signed off on " + job.customer.name + "'s project",
    body: "Review the work and move status to Complete when ready.",
    linkUrl: "/jobs/" + job.id
  });

  return NextResponse.json(updated);
}
