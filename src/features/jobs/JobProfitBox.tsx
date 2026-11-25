function money(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function JobProfitBox(props: {
  quoted: number;
  approvedChangeOrders: number;
  invoiced: number;
  collected: number;
  subCommitted: number;
  subPaid: number;
  otherCosts: number;
}) {
  const clientPrice = props.quoted + props.approvedChangeOrders;
  const projected = clientPrice - props.subCommitted - props.otherCosts;
  const margin = clientPrice > 0 ? (projected / clientPrice) * 100 : null;
  const cashNow = props.collected - props.subPaid - props.otherCosts;
  const tone = projected < 0 ? "text-red-400" : "text-green-400";

  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-medium text-white">Profit</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-graphite-400">Charged to client</p>
          <p className="text-white font-medium">{money(clientPrice)}</p>
          {props.approvedChangeOrders !== 0 && (
            <p className="text-[11px] text-graphite-500">incl. {money(props.approvedChangeOrders)} approved change orders</p>
          )}
        </div>
        <div>
          <p className="text-xs text-graphite-400">Owed to subs</p>
          <p className="text-white font-medium">{money(props.subCommitted)}</p>
        </div>
        <div>
          <p className="text-xs text-graphite-400">Other job costs</p>
          <p className="text-white font-medium">{money(props.otherCosts)}</p>
        </div>
        <div>
          <p className="text-xs text-graphite-400">Projected profit</p>
          <p className={"font-semibold " + tone}>
            {money(projected)}{margin !== null ? " (" + margin.toFixed(0) + "%)" : ""}
          </p>
        </div>
      </div>
      <div className="border-t border-graphite-700 pt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-graphite-400">Invoiced / collected</p>
          <p className="text-graphite-200">{money(props.invoiced)} / {money(props.collected)}</p>
        </div>
        <div>
          <p className="text-xs text-graphite-400">Cash in hand after subs paid</p>
          <p className={cashNow < 0 ? "text-red-400" : "text-graphite-200"}>{money(cashNow)}</p>
        </div>
      </div>
      <p className="text-[11px] text-graphite-500">
        Other job costs = the Actual cost field above (materials, your own labor). Do not also put sub payments there, or they count twice.
      </p>
    </div>
  );
}