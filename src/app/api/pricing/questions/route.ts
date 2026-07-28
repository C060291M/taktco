import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
function canView(role: string) {
  return role !== "FIELD_TECH";
}

export async function GET() {
  const ctx = await requireSession();
  if (!ctx || !canView(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const questions = await db.estimatingQuestion.findMany({ where: { companyId: ctx.company.id }, orderBy: { displayOrder: "asc" } });
  return NextResponse.json(questions);
}

const schema = z.object({
  question: z.string().min(1),
  answerType: z.enum(["YES_NO", "NUMBER", "TEXT"]).default("YES_NO"),
  triggerItemId: z.string().optional()
});

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "A question is required." }, { status: 400 });

  const count = await db.estimatingQuestion.count({ where: { companyId: ctx.company.id } });
  const question = await db.estimatingQuestion.create({
    data: { companyId: ctx.company.id, question: parsed.data.question, answerType: parsed.data.answerType, triggerItemId: parsed.data.triggerItemId, displayOrder: count }
  });
  return NextResponse.json(question, { status: 201 });
}
