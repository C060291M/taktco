import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { PayButton } from "./PayButton";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function InvoicesPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const invoices = await db.invoice.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Invoices</h1>
        <p className="text-sm text-graphite-400">
          Payments here use a local dev stub. Wire in Stripe Connect before going live — see README.
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-graphite-400">No invoices yet.</td></tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3 text-graphite-100">{inv.customer.name}</td>
                <td className="px-4 py-3 text-graphite-300">{money(inv.amount)}</td>
                <td className="px-4 py-3">
                  <Badge color={inv.status === "PAID" ? "green" : inv.status === "OVERDUE" ? "red" : "yellow"}>
                    {inv.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {inv.status !== "PAID" && <PayButton invoiceId={inv.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
