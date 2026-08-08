import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EstimateActions } from "@/features/estimates/EstimateActions";
import { DeleteEstimateButton } from "@/features/estimates/DeleteEstimateButton";
import { CopyPublicLink } from "@/features/estimates/CopyPublicLink";
import { BrandedDocumentHeader } from "@/components/layout/BrandedDocumentHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { analyzeEstimate } from "@/lib/estimatingAdvisor";
import { EstimatingAdvisor } from "@/features/estimates/EstimatingAdvisor";
import { JobCostingSummary } from "@/features/estimates/JobCostingSummary";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function EstimateDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const estimate = await db.estimate.findFirst({
    where: { id: params.id, companyId: ctx.company.id, deletedAt: null },
    include: { customer: true, job: true }
  });
  if (!estimate) notFound();

  const lineItems = estimate.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number; cost?: number }[];

  const advisorFindings = await analyzeEstimate({
    companyId: ctx.company.id,
    lineItems,
    totalAmount: Number(estimate.totalAmount)
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5 print-document">
        <BrandedDocumentHeader company={ctx.company} label="Estimate" />
        <div className="pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">For {estimate.customer.name}</h1>
            {estimate.estimateNumber && <p className="text-xs text-graphite-500">#{estimate.estimateNumber}</p>}
            <p className="text-sm text-graphite-400">Status: {estimate.status.replace("_", " ")}</p>
          </div>
          <div className="flex gap-2">
            <PrintButton />
            <CopyPublicLink token={estimate.approvalToken} />
            {(ctx.user.role === "OWNER" || ctx.user.role === "ADMIN") && (
              <DeleteEstimateButton estimateId={estimate.id} estimateNumber={estimate.estimateNumber} />
            )}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium">Qty</th>
              <th className="py-2 font-medium text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={i} className="border-b border-graphite-700 last:border-0">
                <td className="py-2 text-graphite-100">{li.description}</td>
                <td className="py-2 text-graphite-300">{li.qty} {li.unit}</td>
                <td className="py-2 text-graphite-300 text-right">{money(li.qty * li.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-graphite-700">
          <span className="text-graphite-300">Total</span>
          <span className="text-white text-lg font-semibold">{money(estimate.totalAmount)}</span>
        </div>
        {estimate.warranty && (
          <div className="pt-4">
            <p className="text-xs text-graphite-400 uppercase tracking-wide">Warranty</p>
            <p className="text-sm text-graphite-200 mt-1">{estimate.warranty}</p>
          </div>
        )}
        {estimate.terms && (
          <div className="pt-3">
            <p className="text-xs text-graphite-400 uppercase tracking-wide">Terms</p>
            <p className="text-sm text-graphite-200 mt-1">{estimate.terms}</p>
          </div>
        )}
      </div>

      <JobCostingSummary lineItems={lineItems} />

      <EstimatingAdvisor findings={advisorFindings} />

      <EstimateActions estimateId={estimate.id} status={estimate.status} hasJob={!!estimate.job} />
    </div>
  );
}
