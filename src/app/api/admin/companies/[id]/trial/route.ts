import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({ action: z.enum(["start", "extend7", "endNow", "remove"]) });
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 7;

// Platform-admin only. Changes one company's free-trial window. An extension counts from the
// current end date (or from now if it already passed) and clears the "ending soon" email flag so
// the heads-up can go out again. A company in the closed beta cannot also have a trial. Every
// change is audited.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx || !ctx.user.isPlatformAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const action = parsed.data.action;

  const company = await db.company.findUnique({
    where: { id: params.id },
    select: { id: true, betaEnrolledAt: true, trialEndsAt: true }
  });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const now = new Date();
  let data: { trialStartedAt?: Date | null; trialEndsAt?: Date | null; trialWarningSentAt?: Date | null };

  if (action === "start") {
    if (company.betaEnrolledAt) return NextResponse.json({ error: "This company is in the closed beta. Remove the beta first." }, { status: 400 });
    if (company.trialEndsAt) return NextResponse.json({ error: "This company already has a free trial." }, { status: 400 });
    data = { trialStartedAt: now, trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS), trialWarningSentAt: null };
  } else {
    if (!company.trialEndsAt) return NextResponse.json({ error: "This company is not on a free trial." }, { status: 400 });
    if (action === "remove") {
      data = { trialStartedAt: null, trialEndsAt: null, trialWarningSentAt: null };
    } else if (action === "endNow") {
      data = { trialEndsAt: now };
    } else {
      const base = company.trialEndsAt.getTime() > now.getTime() ? company.trialEndsAt : now;
      data = { trialEndsAt: new Date(base.getTime() + TRIAL_DAYS * DAY_MS), trialWarningSentAt: null };
    }
  }

  const updated = await db.company.update({ where: { id: company.id }, data, select: { trialEndsAt: true } });
  await db.auditLog.create({
    data: { companyId: company.id, userId: ctx.user.id, action: `trial_${action}`, entityType: "company", entityId: company.id }
  });
  return NextResponse.json({ ok: true, trialEndsAt: updated.trialEndsAt });
}