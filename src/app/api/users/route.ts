import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["OWNER", "ADMIN", "SALES_REP", "FIELD_TECH"])
});

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can view the team." }, { status: 403 });
  }

  const users = await db.user.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, phone: true, lastLoginAt: true, createdAt: true }
  });
  return NextResponse.json(users);
}

// Adds a teammate directly (no email invite system - see README). The owner/admin
// sets an initial password here and shares it with the teammate themselves.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can add teammates." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Fill in every field with a valid email and an 8+ character password." }, { status: 400 });

  // Only an owner can create another owner - an admin granting owner-level access
  // to someone else is a privilege escalation we don't allow from this endpoint.
  if (parsed.data.role === "OWNER" && ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can add another owner." }, { status: 403 });
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role
    },
    select: { id: true, name: true, email: true, role: true, phone: true, lastLoginAt: true, createdAt: true }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "user_added", entityType: "user", entityId: user.id }
  });

  return NextResponse.json(user, { status: 201 });
}
