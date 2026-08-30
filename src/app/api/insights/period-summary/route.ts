import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { askClaude } from "@/lib/ai";
import { getPeriodFacts } from "@/lib/periodReport";

// Same free-system-feature pattern as the daily briefing (src/lib/ai.ts
// askClaude, platform-paid, never charges tenant AI credits): compute real
// numbers first via getPeriodFacts, then have AI narrate them into a short
// paragraph. Never invents anything not in the facts object.
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type") || "month";
  const year = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(req.nextUrl.searchParams.get("month") || String(new Date().getMonth()), 10);

  const start = type === "year" ? new Date(year, 0, 1) : new Date(year, month, 1);
  const end = type === "year" ? new Date(year + 1, 0, 1) : new Date(year, month + 1, 1);
  const periodLabel = type === "year"
    ? String(year)
    : start.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const facts = await getPeriodFacts(ctx.company.id, start, end);

  let narrative = "";
  try {
    narrative = await askClaude(
      "You write a short " + type + "ly performance review for " + ctx.company.name + ", a " +
        (ctx.company.tradeType || "construction") + " company, covering " + periodLabel +
        ". Use ONLY the numbers given - never invent or estimate anything not provided. " +
        "3-5 short sentences, direct and plain, like a sharp operations manager reviewing the period with the owner. " +
        "Do not start with a greeting.",
      JSON.stringify(facts)
    );
  } catch {
    narrative = "";
  }

  return NextResponse.json({ facts, narrative, periodLabel });
}
