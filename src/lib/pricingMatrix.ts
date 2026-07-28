import { db } from "@/database/client";

// Small, generic, clearly-a-starting-point templates - NOT authoritative
// industry pricing. The spec is explicit that TAKTCO does not provide
// industry pricing; these exist only so a new company's Pricing Matrix
// isn't a blank page on day one. Every price here is a round, obviously-
// placeholder number the company is expected to edit immediately.
export const STARTER_TEMPLATES: Record<string, { category: string; items: { name: string; unit: string; price: number }[] }[]> = {
  fence: [
    { category: "Materials", items: [
      { name: "Cedar picket, 6ft", unit: "each", price: 8 },
      { name: "Pressure-treated post, 4x4x8", unit: "each", price: 15 },
      { name: "Chain link fabric", unit: "linear foot", price: 4 }
    ]},
    { category: "Labor", items: [
      { name: "Fence installation labor", unit: "linear foot", price: 12 },
      { name: "Gate installation", unit: "each", price: 150 },
      { name: "Old fence removal", unit: "linear foot", price: 3 }
    ]},
    { category: "Services", items: [
      { name: "Service call / estimate visit", unit: "visit", price: 0 }
    ]}
  ],
  roofing: [
    { category: "Materials", items: [
      { name: "Architectural shingles", unit: "square", price: 120 },
      { name: "Underlayment", unit: "square", price: 25 },
      { name: "Ridge vent", unit: "linear foot", price: 6 }
    ]},
    { category: "Labor", items: [
      { name: "Roof tear-off labor", unit: "square", price: 60 },
      { name: "Roof installation labor", unit: "square", price: 150 }
    ]},
    { category: "Services", items: [
      { name: "Roof inspection", unit: "visit", price: 0 }
    ]}
  ],
  general: [
    { category: "Materials", items: [
      { name: "General materials", unit: "each", price: 0 }
    ]},
    { category: "Labor", items: [
      { name: "General labor", unit: "hour", price: 65 }
    ]},
    { category: "Services", items: [
      { name: "Service call / estimate visit", unit: "visit", price: 0 }
    ]},
    { category: "Overhead", items: [
      { name: "Permit fee (pass-through)", unit: "each", price: 0 },
      { name: "Mobilization", unit: "project", price: 0 }
    ]}
  ]
};

export function pickStarterTemplate(tradeType: string | null | undefined) {
  const key = (tradeType || "").toLowerCase();
  if (key.includes("fence")) return STARTER_TEMPLATES.fence;
  if (key.includes("roof")) return STARTER_TEMPLATES.roofing;
  return STARTER_TEMPLATES.general;
}

// Fetches the company's active pricing items, grouped by category, formatted
// as compact text for the AI system prompt. This is the ONLY pricing data
// the AI Estimate Builder is allowed to reference - see the ai-draft route.
export async function getPricingMatrixForAI(companyId: string) {
  const categories = await db.pricingCategory.findMany({
    where: { companyId, active: true },
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        where: { active: true },
        orderBy: { displayOrder: "asc" }
      }
    }
  });

  const questions = await db.estimatingQuestion.findMany({
    where: { companyId, active: true },
    orderBy: { displayOrder: "asc" }
  });

  const hasAnyItems = categories.some((c) => c.items.length > 0);

  const lines: string[] = [];
  for (const cat of categories) {
    if (cat.items.length === 0) continue;
    lines.push(`## ${cat.name}`);
    for (const item of cat.items) {
      const parts = [`- ${item.name}: $${Number(item.price)}/${item.unit}`];
      if (item.minCharge) parts.push(`(min charge $${Number(item.minCharge)})`);
      if (item.notes) parts.push(`- ${item.notes}`);
      lines.push(parts.join(" "));
    }
  }

  return {
    hasAnyItems,
    pricingText: lines.join("\n"),
    questions: questions.map((q) => ({ id: q.id, question: q.question, answerType: q.answerType }))
  };
}
