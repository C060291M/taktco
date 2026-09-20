import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  // The person must type the company's exact name to confirm - same pattern
  // as GitHub's "type the repo name to delete it". Prevents a stray click or
  // muscle memory from triggering an irreversible action.
  confirmName: z.string().min(1),
  reason: z.string().optional()
});

// Permanently and irreversibly destroys a company and everything cascaded
// from it (every user, customer, lead, estimate, contract, job, invoice,
// payment, photo, and automation - see the schema's onDelete: Cascade on
// every companyId relation). This is what the Privacy Policy's "request
// deletion of your account and associated data" promise actually does -
// distinct from cancelling a subscription, which never deletes anything.
// Platform-admin only, and only ever triggered by a company explicitly
// contacting support to request it - never self-service.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.user.isPlatformAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Type the company name to confirm." }, { status: 400 });
  }

  const company = await db.company.findUnique({
    where: { id: params.id },
    include: { users: { where: { role: "OWNER" }, take: 1 } }
  });
  if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  if (parsed.data.confirmName.trim() !== company.name) {
    return NextResponse.json({ error: "The typed name does not match this company's name exactly." }, { status: 400 });
  }

  // Logged BEFORE the delete - a plain string snapshot with no @relation to
  // Company, so this row survives the cascade and remains the only record
  // that this company ever existed once everything else about it is gone.
  await db.accountDeletionLog.create({
    data: {
      deletedCompanyId: company.id,
      companyName: company.name,
      companySubdomain: company.subdomain,
      ownerEmail: company.users[0]?.email,
      deletedByUserId: ctx.user.id,
      deletedByName: ctx.user.name,
      reason: parsed.data.reason
    }
  });

  await db.company.delete({ where: { id: company.id } });

  return NextResponse.json({ ok: true });
}