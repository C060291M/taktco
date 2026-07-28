import { db } from "@/database/client";
import type { Company } from "@prisma/client";

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
// Includes cost (when set) so the AI can output real per-line-item cost for
// job costing, and the company's Business Rules so estimates respect the
// owner's own minimums/margins/fees instead of generic defaults.
export async function getPricingMatrixForAI(companyId: string) {
  const [categories, questions, company] = await Promise.all([
    db.pricingCategory.findMany({
      where: { companyId, active: true },
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          where: { active: true },
          orderBy: { displayOrder: "asc" }
        }
      }
    }),
    db.estimatingQuestion.findMany({
      where: { companyId, active: true },
      orderBy: { displayOrder: "asc" }
    }),
    db.company.findUnique({ where: { id: companyId } })
  ]);

  const hasAnyItems = categories.some((c) => c.items.length > 0);

  const lines: string[] = [];
  for (const cat of categories) {
    if (cat.items.length === 0) continue;
    lines.push(`## ${cat.name}`);
    for (const item of cat.items) {
      const parts = [`- ${item.name}: $${Number(item.price)}/${item.unit} (id: ${item.id})`];
      if (item.cost) parts.push(`[cost: $${Number(item.cost)}]`);
      if (item.minCharge) parts.push(`(min charge $${Number(item.minCharge)})`);
      if (item.notes) parts.push(`- ${item.notes}`);
      lines.push(parts.join(" "));
    }
  }

  const questionsWithTriggers = await Promise.all(
    questions.map(async (q) => {
      let triggerItem: { name: string; price: number } | null = null;
      if (q.triggerItemId) {
        const item = await db.pricingItem.findUnique({ where: { id: q.triggerItemId } });
        if (item) triggerItem = { name: item.name, price: Number(item.price) };
      }
      return { id: q.id, question: q.question, answerType: q.answerType, triggerItem };
    })
  );

  return {
    hasAnyItems,
    pricingText: lines.join("\n"),
    questions: questionsWithTriggers,
    businessRulesText: formatBusinessRules(company)
  };
}

function formatBusinessRules(company: Company | null): string {
  if (!company) return "";
  const rules: string[] = [];
  if (company.defaultLaborRate) rules.push(`Default labor rate: $${Number(company.defaultLaborRate)}/hr - never price labor below this unless a pricing item explicitly overrides it.`);
  if (company.minJobPrice) rules.push(`Minimum job price: $${Number(company.minJobPrice)} - if the estimate totals less than this, note it in flags rather than silently raising the price.`);
  if (company.targetMarginPercent) rules.push(`Target gross margin: ${Number(company.targetMarginPercent)}% - if the estimate's margin (using item cost data) falls well below this, flag it.`);
  if (company.mobilizationFee) rules.push(`Mobilization fee: $${Number(company.mobilizationFee)} - include as a line item if this job would reasonably require it.`);
  if (company.fuelCharge) rules.push(`Fuel charge: $${Number(company.fuelCharge)} - include if relevant.`);
  if (company.travelCharge) rules.push(`Travel charge: $${Number(company.travelCharge)} - include if relevant.`);
  if (company.warrantyLengthMonths) rules.push(`Standard warranty length: ${company.warrantyLengthMonths} months.`);
  return rules.length ? `\n\nCOMPANY BUSINESS RULES:\n${rules.map((r) => `- ${r}`).join("\n")}` : "";
}
