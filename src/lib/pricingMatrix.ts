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
  ],
  hvac: [
    { category: "Materials", items: [
      { name: "Central AC unit, 3-ton", unit: "each", price: 3500 },
      { name: "Furnace, gas", unit: "each", price: 2800 },
      { name: "Ductwork", unit: "linear foot", price: 12 },
      { name: "Thermostat, smart", unit: "each", price: 250 }
    ]},
    { category: "Labor", items: [
      { name: "HVAC install labor", unit: "hour", price: 95 },
      { name: "Diagnostic / service call", unit: "visit", price: 89 }
    ]},
    { category: "Services", items: [
      { name: "Seasonal maintenance tune-up", unit: "visit", price: 150 }
    ]}
  ],
  electrical: [
    { category: "Materials", items: [
      { name: "Electrical panel, 200-amp", unit: "each", price: 1800 },
      { name: "Outlet, standard", unit: "each", price: 15 },
      { name: "Light fixture, standard", unit: "each", price: 60 },
      { name: "Romex wire, 12-gauge", unit: "linear foot", price: 1 }
    ]},
    { category: "Labor", items: [
      { name: "Electrician labor", unit: "hour", price: 110 },
      { name: "Diagnostic / service call", unit: "visit", price: 95 }
    ]},
    { category: "Services", items: [
      { name: "Panel inspection", unit: "visit", price: 125 }
    ]}
  ],
  plumbing: [
    { category: "Materials", items: [
      { name: "Water heater, 50-gallon", unit: "each", price: 1200 },
      { name: "PEX pipe", unit: "linear foot", price: 2 },
      { name: "Toilet, standard", unit: "each", price: 250 },
      { name: "Faucet, standard", unit: "each", price: 180 }
    ]},
    { category: "Labor", items: [
      { name: "Plumber labor", unit: "hour", price: 105 },
      { name: "Diagnostic / service call", unit: "visit", price: 89 }
    ]},
    { category: "Services", items: [
      { name: "Drain cleaning", unit: "visit", price: 175 }
    ]}
  ],
  painting: [
    { category: "Materials", items: [
      { name: "Interior paint, per gallon", unit: "each", price: 45 },
      { name: "Exterior paint, per gallon", unit: "each", price: 55 },
      { name: "Primer, per gallon", unit: "each", price: 35 }
    ]},
    { category: "Labor", items: [
      { name: "Interior painting labor", unit: "square foot", price: 2 },
      { name: "Exterior painting labor", unit: "square foot", price: 3 },
      { name: "Prep / patching labor", unit: "hour", price: 55 }
    ]},
    { category: "Services", items: [
      { name: "Color consultation", unit: "visit", price: 0 }
    ]}
  ],
  landscaping: [
    { category: "Materials", items: [
      { name: "Mulch", unit: "cubic yard", price: 45 },
      { name: "Sod", unit: "square foot", price: 1 },
      { name: "Retaining wall block", unit: "each", price: 4 }
    ]},
    { category: "Labor", items: [
      { name: "Landscaping labor", unit: "hour", price: 55 },
      { name: "Lawn mowing", unit: "visit", price: 65 },
      { name: "Mulch installation", unit: "cubic yard", price: 25 }
    ]},
    { category: "Services", items: [
      { name: "Design consultation", unit: "visit", price: 0 }
    ]}
  ],
  home_security: [
    { category: "Materials", items: [
      { name: "Security camera", unit: "each", price: 200 },
      { name: "Door/window sensor", unit: "each", price: 35 },
      { name: "Control panel", unit: "each", price: 300 }
    ]},
    { category: "Labor", items: [
      { name: "Installation labor", unit: "hour", price: 85 }
    ]},
    { category: "Services", items: [
      { name: "System monitoring setup", unit: "visit", price: 0 },
      { name: "Monthly monitoring", unit: "month", price: 35 }
    ]}
  ],
  gutter_installation: [
    { category: "Materials", items: [
      { name: "Seamless gutter, aluminum", unit: "linear foot", price: 8 },
      { name: "Downspout", unit: "each", price: 45 },
      { name: "Gutter guard", unit: "linear foot", price: 6 }
    ]},
    { category: "Labor", items: [
      { name: "Gutter installation labor", unit: "linear foot", price: 4 },
      { name: "Old gutter removal", unit: "linear foot", price: 2 }
    ]},
    { category: "Services", items: [
      { name: "Gutter cleaning", unit: "visit", price: 150 }
    ]}
  ],
  solar_screen_installation: [
    { category: "Materials", items: [
      { name: "Solar screen, per window", unit: "each", price: 85 },
      { name: "Screen frame, aluminum", unit: "linear foot", price: 5 }
    ]},
    { category: "Labor", items: [
      { name: "Installation labor", unit: "each", price: 40 }
    ]},
    { category: "Services", items: [
      { name: "Measurement visit", unit: "visit", price: 0 }
    ]}
  ],
  siding: [
    { category: "Materials", items: [
      { name: "Vinyl siding", unit: "square foot", price: 4 },
      { name: "House wrap", unit: "square foot", price: 1 },
      { name: "Trim", unit: "linear foot", price: 3 }
    ]},
    { category: "Labor", items: [
      { name: "Siding installation labor", unit: "square foot", price: 3 },
      { name: "Old siding removal", unit: "square foot", price: 1 }
    ]},
    { category: "Services", items: [
      { name: "Service call / estimate visit", unit: "visit", price: 0 }
    ]}
  ],
  windows: [
    { category: "Materials", items: [
      { name: "Vinyl window, standard", unit: "each", price: 450 },
      { name: "Window, double-hung", unit: "each", price: 550 }
    ]},
    { category: "Labor", items: [
      { name: "Window installation labor", unit: "each", price: 150 },
      { name: "Old window removal", unit: "each", price: 50 }
    ]},
    { category: "Services", items: [
      { name: "Measurement visit", unit: "visit", price: 0 }
    ]}
  ],
  doors: [
    { category: "Materials", items: [
      { name: "Entry door, steel", unit: "each", price: 650 },
      { name: "Interior door", unit: "each", price: 200 },
      { name: "Door hardware set", unit: "each", price: 85 }
    ]},
    { category: "Labor", items: [
      { name: "Door installation labor", unit: "each", price: 175 },
      { name: "Old door removal", unit: "each", price: 60 }
    ]},
    { category: "Services", items: [
      { name: "Measurement visit", unit: "visit", price: 0 }
    ]}
  ],
  handyman: [
    { category: "Materials", items: [
      { name: "General materials", unit: "each", price: 0 }
    ]},
    { category: "Labor", items: [
      { name: "Handyman labor", unit: "hour", price: 65 },
      { name: "Minimum service charge", unit: "visit", price: 95 }
    ]},
    { category: "Services", items: [
      { name: "Service call / estimate visit", unit: "visit", price: 0 }
    ]}
  ],
  cleaning: [
    { category: "Labor", items: [
      { name: "Standard cleaning", unit: "visit", price: 120 },
      { name: "Deep cleaning", unit: "visit", price: 220 },
      { name: "Move-in/move-out cleaning", unit: "visit", price: 280 },
      { name: "Recurring cleaning (biweekly)", unit: "visit", price: 100 }
    ]},
    { category: "Materials", items: [
      { name: "Cleaning supplies (if not customer-provided)", unit: "visit", price: 15 }
    ]}
  ]
};

export function pickStarterTemplate(tradeType: string | null | undefined) {
  const key = (tradeType || "").toLowerCase();
  if (key.includes("fence")) return STARTER_TEMPLATES.fence;
  if (key.includes("roof")) return STARTER_TEMPLATES.roofing;
  if (key.includes("hvac") || key.includes("heating") || key.includes("air condition")) return STARTER_TEMPLATES.hvac;
  if (key.includes("electric")) return STARTER_TEMPLATES.electrical;
  if (key.includes("plumb")) return STARTER_TEMPLATES.plumbing;
  if (key.includes("paint")) return STARTER_TEMPLATES.painting;
  if (key.includes("landscap") || key.includes("lawn")) return STARTER_TEMPLATES.landscaping;
  if (key.includes("security") || key.includes("alarm")) return STARTER_TEMPLATES.home_security;
  if (key.includes("gutter")) return STARTER_TEMPLATES.gutter_installation;
  if (key.includes("solar screen") || key.includes("sun screen")) return STARTER_TEMPLATES.solar_screen_installation;
  if (key.includes("siding")) return STARTER_TEMPLATES.siding;
  if (key.includes("window")) return STARTER_TEMPLATES.windows;
  if (key.includes("door")) return STARTER_TEMPLATES.doors;
  if (key.includes("handyman")) return STARTER_TEMPLATES.handyman;
  if (key.includes("clean")) return STARTER_TEMPLATES.cleaning;
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
