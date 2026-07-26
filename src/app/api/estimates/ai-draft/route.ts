import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { askClaudeForJSON } from "@/lib/ai";
import { InsufficientCreditsError, deductCredits } from "@/lib/aiGateway";

const schema = z.object({ description: z.string().min(5) });

type AiEstimateDraft = {
  title: string;
  lineItems: { description: string; qty: number; unit: string; unitPrice: number }[];
  warranty: string;
  terms: string;
};

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Describe the job first." }, { status: 400 });

  const systemPrompt = `You are an experienced estimator for a ${ctx.company.tradeType || "trade"} business called "${ctx.company.name}"${
    ctx.company.serviceArea ? ` serving ${ctx.company.serviceArea}` : ""
  }. Given a plain-language job description, produce a realistic, itemized estimate draft as JSON matching this exact shape:
{
  "title": string (short project title),
  "lineItems": [ { "description": string, "qty": number, "unit": string, "unitPrice": number } ],
  "warranty": string (1-2 sentences, realistic for this trade),
  "terms": string (1-2 sentences, standard payment/terms language)
}
Include materials, labor, and equipment as separate line items where relevant. Use realistic current market pricing for the described scope. Return 3-8 line items.`;

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
