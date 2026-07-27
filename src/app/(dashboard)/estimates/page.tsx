import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { NewEstimateForm } from "./NewEstimateForm";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function EstimatesPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const [estimates, customers] = await Promise.all([
    db.estimate.findMany({ where: { companyId: ctx.company.id }, include: { customer: true }, orderBy: { createdAt: "desc" } }),
    db.customer.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Estimates</h1>
          <p className="text-sm text-graphite-400">Build a quote, send it, get it approved.</p>
        </div>
        <NewEstimateForm customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {estimates.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-graphite-400">No estimates yet.</td></tr>
            )}
            {estimates.map((e) => (
              <tr key={e.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3">
                  <Link href={`/estimates/${e.id}`} className="text-graphite-100 hover:text-accent">{e.customer.name}</Link>
                </td>
                <td className="px-4 py-3 text-graphite-300">{money(e.totalAmount)}</td>
                <td className="px-4 py-3">
                  <Badge color={e.status === "APPROVED" ? "green" : e.status === "DECLINED" ? "red" : "blue"}>{e.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
