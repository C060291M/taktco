import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/database/client";
import { askClaudeForJSON } from "@/lib/ai";
import { InsufficientCreditsError, deductCredits } from "@/lib/aiGateway";

function canManage(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

const schema = z.object({ context: z.string().optional() });

type Suggestion = { name: string; unit: string; categoryName: string };

// Suggests pricing item NAMES only - never a price. Even here, where the
// principle is "help the owner build their matrix faster" rather than
// "price a real job", the AI still doesn't invent a dollar figure - every
// suggested item is created at $0 with a clear label that the owner needs
// to set the real price, keeping "AI never invents pricing" true everywhere
// in the product, not just the estimate builder.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx || !canManage(ctx.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const existingCategories = await db.pricingCategory.findMany({ where: { companyId: ctx.company.id }, include: { items: true } });
  const existingSummary = existingCategories.map((c) => `${c.name}: ${c.items.map((i) => i.name).join(", ") || "(empty)"}`).join("\n");

  const systemPrompt = `You help a ${ctx.company.tradeType || "trade"} business build out their pricing catalog. Given what they already have and optionally a description of their business, suggest NEW pricing item names they're likely missing - not prices, just names, units, and which category each belongs to (existing category name if it fits, otherwise a sensible new one). Never suggest an item that already exists in their list. Return JSON: { "suggestions": [ { "name": string, "unit": string, "categoryName": string } ] }, 5-10 suggestions.

THEIR EXISTING PRICING MATRIX:
${existingSummary || "(empty)"}`;

  try {
    await deductCredits(ctx.company.id, "estimate_builder");
    const result = await askClaudeForJSON<{ suggestions: Suggestion[] }>(systemPrompt, parsed.data.context || "Suggest items for my business.");
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI suggestion failed." }, { status: 502 });
  }
}
