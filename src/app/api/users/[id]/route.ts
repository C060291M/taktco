import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["OWNER", "ADMIN", "SALES_REP", "FIELD_TECH"]).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can change roles." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const target = await db.user.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Only an owner can grant or remove owner-level access - stops an admin from
  // promoting themselves or someone else to owner.
  if (parsed.data.role && (parsed.data.role === "OWNER" || target.role === "OWNER") && ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can change owner-level access." }, { status: 403 });
  }

  // Never allow the last remaining owner to be demoted - that would lock the
  // company out of owner-only actions like billing and payment verification.
  if (parsed.data.role && target.role === "OWNER" && parsed.data.role !== "OWNER") {
    const ownerCount = await db.user.count({ where: { companyId: ctx.company.id, role: "OWNER" } });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "This is the only owner - promote someone else to owner first." }, { status: 400 });
    }
  }

  const updated = await db.user.update({
    where: { id: target.id },
    data: { ...(parsed.data.role ? { role: parsed.data.role } : {}), ...(parsed.data.name ? { name: parsed.data.name } : {}), ...(parsed.data.email ? { email: parsed.data.email } : {}) },
    select: { id: true, name: true, email: true, role: true }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "user_updated", entityType: "user", entityId: target.id }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can remove teammates." }, { status: 403 });
  }

  const target = await db.user.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (target.id === ctx.user.id) {
    return NextResponse.json({ error: "You can't remove your own account. Ask another owner to do it." }, { status: 400 });
  }

  if (target.role === "OWNER") {
    const ownerCount = await db.user.count({ where: { companyId: ctx.company.id, role: "OWNER" } });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "You can't remove the only owner." }, { status: 400 });
    }
    if (ctx.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can remove another owner." }, { status: 403 });
    }
  }

  await db.user.delete({ where: { id: target.id } });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "user_removed", entityType: "user", entityId: target.id }
  });

  return NextResponse.json({ ok: true });
}









