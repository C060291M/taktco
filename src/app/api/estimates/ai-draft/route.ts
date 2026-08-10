import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { askClaudeForJSON } from "@/lib/ai";
import { InsufficientCreditsError, deductCredits } from "@/lib/aiGateway";
import { getPricingMatrixForAI } from "@/lib/pricingMatrix";

const schema = z.object({
  description: z.string().min(5),
  questionAnswers: z.record(z.string()).optional() // { questionId: answer }
});

type AiEstimateDraft = {
  title: string;
  lineItems: { description: string; qty: number; unit: string; unitPrice: number; cost?: number }[];
  warranty: string;
  terms: string;
  flags?: string[]; // things the AI wants to surface: missing pricing, unusual margin, etc.
};

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Describe the job first." }, { status: 400 });

  const { hasAnyItems, pricingText, questions, businessRulesText } = await getPricingMatrixForAI(ctx.company.id);

  if (!hasAnyItems) {
    return NextResponse.json({
      error: "PRICING_MATRIX_EMPTY",
      message: "Your Pricing Matrix doesn't have any active pricing items yet. Add some in Settings -> Pricing Matrix so the AI has real prices to build estimates from - it won't invent numbers on its own."
    }, { status: 400 });
  }

  const answeredContext = parsed.data.questionAnswers && questions.length > 0
    ? "\n\nAnswers to the company's estimating questions for this job:\n" +
      questions
        .filter((q) => parsed.data.questionAnswers?.[q.id] !== undefined)
        .map((q) => {
          const answer = parsed.data.questionAnswers![q.id];
          const triggerNote = q.triggerItem && answer?.toLowerCase() === "yes"
            ? ` -> the answer is Yes, so include "${q.triggerItem.name}" at its exact price of $${q.triggerItem.price} as a line item.`
            : "";
          return `- ${q.question}: ${answer}${triggerNote}`;
        })
        .join("\n")
    : "";

  // This is the core change from before: the AI is grounded in the
  // company's real Pricing Matrix and explicitly forbidden from inventing
  // numbers. If the described job needs something not in the matrix, it
  // must say so via `flags` rather than guess a market price.
  const systemPrompt = `You are an experienced estimator for a ${ctx.company.tradeType || "trade"} business called "${ctx.company.name}"${
    ctx.company.serviceArea ? ` serving ${ctx.company.serviceArea}` : ""
  }.

You must build the estimate ONLY from this company's own Pricing Matrix below. Never invent a price, never use general market knowledge for pricing, and never estimate a price that isn't listed. If the described job needs something not in the matrix, do not price it - instead list it in "flags" as something needing a pricing item added (e.g. "No pricing item found for X - add one in the Pricing Matrix").

COMPANY PRICING MATRIX:
${pricingText}
${businessRulesText}
${answeredContext}

Given a plain-language job description, produce a realistic, itemized estimate draft as JSON matching this exact shape:
{
  "title": string (short project title),
  "lineItems": [ { "description": string, "qty": number, "unit": string, "unitPrice": number, "cost": number (optional - only include if the matching pricing item listed a [cost: $X], omit the field entirely otherwise, never guess a cost) } ],
  "warranty": string (1-2 sentences, realistic for this trade),
  "terms": string (1-2 sentences, standard payment/terms language),
  "flags": string[] (anything unusual worth the estimator's attention - missing pricing items, an unusually large quantity, duplicate-looking items, total below the minimum job price, margin below target. Each flag must be ONE short sentence, under 20 words - no multi-sentence explanations. Maximum 5 flags. Empty array if nothing stands out.)
}
Every unitPrice in lineItems must come directly from the Pricing Matrix above - copy the price exactly, only the quantity varies based on the job description. Use the exact item names and units from the matrix where they match. Return 3-8 line items.`;

  try {
    await deductCredits(ctx.company.id, "estimate_builder");
    const draft = await askClaudeForJSON<AiEstimateDraft>(systemPrompt, parsed.data.description);
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI generation failed." }, { status: 502 });
  }
}

