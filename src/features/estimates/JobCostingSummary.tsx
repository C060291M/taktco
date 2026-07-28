type LineItem = { qty: number; unitPrice: number; cost?: number };

// Only shows real numbers computed from cost data the AI actually pulled
// from the Pricing Matrix (see ai-draft/route.ts) - never a fabricated
// margin. If some or all line items lack cost data (manual entry, or items
// with no cost set in the Pricing Matrix), that's stated plainly instead of
// silently guessing or hiding the gap.
export function JobCostingSummary({ lineItems }: { lineItems: LineItem[] }) {
  const withCost = lineItems.filter((li) => li.cost !== undefined && li.cost !== null);
  if (withCost.length === 0) return null;

  const revenue = withCost.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
  const cost = withCost.reduce((sum, li) => sum + li.qty * (li.cost || 0), 0);
  const grossProfit = revenue - cost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const missingCount = lineItems.length - withCost.length;

  return (
    <div className="card p-4 border-graphite-700">
      <p className="text-[11px] text-graphite-500 uppercase tracking-wide mb-2">
        Job costing {missingCount > 0 ? `(${withCost.length} of ${lineItems.length} line items have cost data)` : ""}
      </p>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-graphite-400 text-xs">Revenue</p>
          <p className="text-white font-medium">${revenue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-graphite-400 text-xs">Est. cost</p>
          <p className="text-white font-medium">${cost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-graphite-400 text-xs">Gross profit / margin</p>
          <p className={`font-medium ${grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${grossProfit.toLocaleString()} ({margin.toFixed(0)}%)
          </p>
        </div>
      </div>
      {missingCount > 0 && (
        <p className="text-[11px] text-graphite-500 mt-2">
          {missingCount} line item{missingCount === 1 ? "" : "s"} without cost data excluded from this calculation - add costs to those Pricing Matrix items for a complete picture.
        </p>
      )}
    </div>
  );
}
