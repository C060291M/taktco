import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["ADMIN", "SALES_REP", "FIELD_TECH"])
});

function generateTempPassword() {
  // Readable-ish random password (no ambiguous chars) for handing off in person/chat -
  // not emailed anywhere, since there's no email service wired up.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await db.user.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, phone: true, lastLoginAt: true, createdAt: true }
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can add team members." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a name, valid email, and role." }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await db.user.create({
    data: {
      companyId: ctx.company.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash
    }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "user_added", entityType: "user", entityId: user.id }
  });

  // Temp password is returned once, here, and never stored in plaintext or logged again -
  // the owner is responsible for handing it to the teammate directly.
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, tempPassword }, { status: 201 });
}
