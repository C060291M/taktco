import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EstimateActions } from "./EstimateActions";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function EstimateDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const estimate = await db.estimate.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, job: true }
  });
  if (!estimate) notFound();

  const lineItems = estimate.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Estimate for {estimate.customer.name}</h1>
        <p className="text-sm text-graphite-400">Status: {estimate.status.replace("_", " ")}</p>
      </div>

      <div className="card p-5">
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
      </div>

      <EstimateActions estimateId={estimate.id} status={estimate.status} hasJob={!!estimate.job} />
    </div>
  );
}
