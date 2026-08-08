import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { generateWithGateway, InsufficientCreditsError } from "@/lib/aiGateway";

const schema = z.object({ description: z.string().min(5), contractType: z.string() });

// Drafts contract content from a plain-language job description - the
// output lands in the same editable content field the 6 built-in templates
// use, so it's reviewed and editable before ever being saved, same as every
// other AI-drafted document in the app (estimates, marketing posts).
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Describe the job first." }, { status: 400 });

  const systemPrompt = `You are drafting a ${parsed.data.contractType} contract for a ${ctx.company.tradeType || "trade"} business called "${ctx.company.name}"${ctx.company.serviceArea ? ` serving ${ctx.company.serviceArea}` : ""}.

Given a plain-language description of the job, write a complete, professional contract document as plain text (not JSON, not markdown headers - just well-formatted contract text with clear section breaks). Include: parties involved (use placeholders like [Customer Name] and [Company Name]), scope of work, payment terms and schedule, timeline, warranty${ctx.company.defaultWarrantyText ? ` (base it on this warranty language: "${ctx.company.defaultWarrantyText}")` : ""}, and standard construction contract clauses (change orders, permits, liability). This is a draft - the business owner will review and edit it before sending, so be thorough and realistic but don't fabricate specific dollar amounts or dates beyond what's given.`;

  try {
    const content = await generateWithGateway({
      companyId: ctx.company.id,
      feature: "contract_builder",
      systemPrompt,
      userPrompt: parsed.data.description
    });
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI draft failed." }, { status: 502 });
  }
}
