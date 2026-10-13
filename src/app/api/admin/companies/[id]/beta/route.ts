import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ action: z.enum(["enroll", "extend14", "extend30", "endNow", "unenroll"]) });
const DAY_MS = 24 * 60 * 60 * 1000;

// Platform-admin only. Changes one company's closed-beta window. An extension counts
// from the current end date (or from now if it already passed) and clears the
// "ending soon" email flag so the heads-up can go out again. Every change is audited.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const action = parsed.data.action;

  const company = await db.company.findUnique({
    where: { id: params.id },
    select: { id: true, betaEnrolledAt: true, betaEndsAt: true }
  });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const now = new Date();
  let data: { betaEnrolledAt?: Date | null; betaEndsAt?: Date | null; betaWarningSentAt?: Date | null };

  if (action === "enroll") {
    if (company.betaEnrolledAt) return NextResponse.json({ error: "This company is already in the beta." }, { status: 400 });
    data = { betaEnrolledAt: now, betaEndsAt: new Date(now.getTime() + 30 * DAY_MS), betaWarningSentAt: null };
  } else {
    if (!company.betaEnrolledAt || !company.betaEndsAt) {
      return NextResponse.json({ error: "This company is not in the beta." }, { status: 400 });
    }
    if (action === "unenroll") {
      data = { betaEnrolledAt: null, betaEndsAt: null, betaWarningSentAt: null };
    } else if (action === "endNow") {
      data = { betaEndsAt: now };
    } else {
      const days = action === "extend14" ? 14 : 30;
      const base = company.betaEndsAt.getTime() > now.getTime() ? company.betaEndsAt : now;
      data = { betaEndsAt: new Date(base.getTime() + days * DAY_MS), betaWarningSentAt: null };
    }
  }

  const updated = await db.company.update({ where: { id: company.id }, data, select: { betaEndsAt: true } });
  await db.auditLog.create({
    data: { companyId: company.id, userId: ctx.user.id, action: `beta_${action}`, entityType: "company", entityId: company.id }
  });
  return NextResponse.json({ ok: true, betaEndsAt: updated.betaEndsAt });
}