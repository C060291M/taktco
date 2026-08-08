import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateWithGateway, InsufficientCreditsError } from "@/lib/aiGateway";
import { computeBusinessHealth } from "@/lib/businessHealth";

// Reuses the exact same real, disclosed numbers the Business Health Score
// computes (same shared function, in-process - no fragile self-fetch
// between API routes) - the AI is only ever asked to write prose ABOUT real
// numbers already calculated in code, never to invent or estimate a metric
// itself. Same grounding discipline as the AI Estimate Builder being
// grounded in the real Pricing Matrix.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const health = await computeBusinessHealth(ctx.company.id);

  const metricsText = health.findings.map((f) => `- ${f.label}: ${f.score}/${f.max} - ${f.detail}`).join("\n");

  const systemPrompt = `You are a business advisor for a ${ctx.company.tradeType || "trade"} business called "${ctx.company.name}". Write a short, plain-English analysis based ONLY on the real metrics below - never invent a number or trend that isn't given to you. Structure it as: a 2-3 sentence overall summary, then 2-4 specific, actionable recommendations tied directly to the weakest metrics below. Keep it concise and practical, not generic business-book language.

REAL BUSINESS METRICS (overall health score: ${health.score}/100, ${health.label}):
${metricsText}
${health.insights.length ? `\nFlagged concerns:\n${health.insights.map((i) => `- ${i}`).join("\n")}` : ""}`;

  try {
    const analysis = await generateWithGateway({
      companyId: ctx.company.id,
      feature: "business_analysis",
      systemPrompt,
      userPrompt: "Analyze my business's current performance and tell me what to focus on."
    });
    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) return NextResponse.json({ error: "INSUFFICIENT_CREDITS" }, { status: 402 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis failed." }, { status: 502 });
  }
}
