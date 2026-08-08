import { db } from "@/database/client";

// Atomically claims the next invoice/estimate number for a company. Uses
// Prisma's `increment` operator, which is a real atomic DB-level operation
// (translates to an atomic UPDATE ... SET x = x + 1 RETURNING x in
// Postgres) - not a read-then-write in application code, so two invoices
// created at the same instant can never claim the same number. Counters
// only ever go up, even across deletions, so a number is never reissued.
export async function claimNextInvoiceNumber(companyId: string): Promise<string> {
  const company = await db.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true }
  });
  const claimed = company.nextInvoiceNumber - 1; // increment returns the NEW value; the number we just claimed is one less
  return `INV-${String(claimed).padStart(4, "0")}`;
}

export async function claimNextEstimateNumber(companyId: string): Promise<string> {
  const company = await db.company.update({
    where: { id: companyId },
    data: { nextEstimateNumber: { increment: 1 } },
    select: { nextEstimateNumber: true }
  });
  const claimed = company.nextEstimateNumber - 1;
  return `EST-${String(claimed).padStart(4, "0")}`;
}
