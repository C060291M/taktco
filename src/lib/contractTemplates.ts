export const CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "CONSTRUCTION_CONTRACT", label: "Construction Contract" },
  { value: "CHANGE_ORDER", label: "Change Order" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "PAYMENT_AGREEMENT", label: "Payment Agreement" },
  { value: "MAINTENANCE_AGREEMENT", label: "Maintenance Agreement" }
];

// Starting points only - every [BRACKETED] section and the rest of the text is
// meant to be edited freely per job. {{tokens}} get auto-filled with known values
// (company/customer name, today's date) when a contract is created; everything
// else is intentionally left for the business to fill in themselves, since scope,
// pricing, and terms vary job to job and trade to trade.
const TEMPLATES: Record<string, string> = {
  SERVICE_AGREEMENT: `SERVICE AGREEMENT

Between {{companyName}} ("Contractor") and {{customerName}} ("Client")
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. SCOPE OF WORK
{{scope}}

2. PRICING
Total price: {{totalAmount}}
Payment terms: {{paymentTerms}}

3. TIMELINE
Estimated start date: [DATE]
Estimated completion date: [DATE]

4. MATERIALS
[Who supplies materials, and any allowances]

5. CHANGE ORDERS
Any changes to the scope of work must be agreed to in writing by both parties before work proceeds.

6. TERMINATION
[Terms under which either party may cancel this agreement]

Signed:
Contractor: {{companyName}}
Client: {{customerName}}`,

  CONSTRUCTION_CONTRACT: `CONSTRUCTION CONTRACT

Between {{companyName}} ("Contractor") and {{customerName}} ("Owner")
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. PROJECT DESCRIPTION
[Describe the construction project in detail]

2. CONTRACT PRICE
Total contract price: [$AMOUNT]
Payment schedule: [e.g., draws tied to milestones]

3. PERMITS
[Who is responsible for obtaining permits]

4. WARRANTY
[Warranty terms - see also the separate Warranty document type]

5. INSURANCE
Contractor shall maintain [general liability / workers' comp] insurance for the duration of the project.

6. DISPUTE RESOLUTION
[e.g., mediation before litigation]

Signed:
Contractor: {{companyName}}
Owner: {{customerName}}`,

  CHANGE_ORDER: `CHANGE ORDER

Project: [Reference original contract/estimate]
Between {{companyName}} and {{customerName}}
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. DESCRIPTION OF CHANGE
[What is changing from the original scope of work]

2. REASON FOR CHANGE
[Why this change is needed]

3. COST IMPACT
Additional cost: [$AMOUNT]
Revised total contract price: [$AMOUNT]

4. TIME IMPACT
Additional days required: [NUMBER]
Revised completion date: [DATE]

This change order becomes part of the original agreement once signed by both parties.

Signed:
Contractor: {{companyName}}
Client: {{customerName}}`,

  WARRANTY: `WARRANTY

Issued by {{companyName}} to {{customerName}}
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. COVERAGE
This warranty covers [workmanship / specific materials] for a period of [X years/months] from the date of completion.

2. WHAT IS COVERED
[Describe covered defects or issues]

3. WHAT IS NOT COVERED
[Normal wear and tear, damage from misuse, acts of God, etc.]

4. HOW TO MAKE A CLAIM
[Contact information and process for warranty claims]

Issued by: {{companyName}}
For: {{customerName}}`,

  PAYMENT_AGREEMENT: `PAYMENT AGREEMENT

Between {{companyName}} and {{customerName}}
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. TOTAL AMOUNT DUE
[$AMOUNT]

2. PAYMENT SCHEDULE
[e.g., $X due on DATE, $Y due on DATE, remaining balance due on completion]

3. LATE PAYMENT
[Terms for late payments, if any]

4. ACCEPTED PAYMENT METHODS
[Card, ACH, check, etc.]

Signed:
{{companyName}}: __________________
{{customerName}}: __________________`,

  MAINTENANCE_AGREEMENT: `MAINTENANCE AGREEMENT

Between {{companyName}} ("Service Provider") and {{customerName}} ("Client")
Date: {{date}}
Property/Service Address: {{customerAddress}}

1. SERVICES INCLUDED
[Describe recurring maintenance services covered]

2. FREQUENCY
[e.g., quarterly, annually]

3. TERM
This agreement covers the period from [START DATE] to [END DATE] and [renews automatically / must be renewed manually].

4. PRICING
[$AMOUNT] per [visit/month/year]

5. EXCLUSIONS
[What is not covered under this maintenance agreement]

Signed:
Service Provider: {{companyName}}
Client: {{customerName}}`
};

export function getContractTemplate(
  type: string,
  companyName: string,
  customerName: string,
  customerAddress?: string | null,
  estimate?: { lineItems: { description: string; qty: number; unit: string; unitPrice: number }[]; totalAmount: number; terms: string | null }
): string {
  const template = TEMPLATES[type] || "";
  const date = new Date().toLocaleDateString();

  const scope = estimate && estimate.lineItems.length > 0
    ? estimate.lineItems.map((li) => `- ${li.description} (${li.qty} ${li.unit})`).join("\n")
    : "[Describe the work to be performed]";
  const totalAmount = estimate
    ? `${estimate.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "[$AMOUNT]";
  const paymentTerms = estimate?.terms || "[e.g., 50% deposit, balance due on completion]";

  return template
    .replaceAll("{{companyName}}", companyName)
    .replaceAll("{{customerName}}", customerName)
    .replaceAll("{{date}}", date).replaceAll("{{customerAddress}}", customerAddress || "[ADDRESS]")
    .replaceAll("{{scope}}", scope)
    .replaceAll("{{totalAmount}}", totalAmount)
    .replaceAll("{{paymentTerms}}", paymentTerms);
}





