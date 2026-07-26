import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LegalDisclaimer } from "@/components/layout/LegalDisclaimer";
import { NewContractForm } from "@/features/contracts/NewContractForm";
import { CONTRACT_TYPES } from "@/lib/contractTemplates";

function typeLabel(type: string) {
  return CONTRACT_TYPES.find((t) => t.value === type)?.label || type;
}

export default async function ContractsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const [contracts, customers] = await Promise.all([
    db.contract.findMany({ where: { companyId: ctx.company.id }, include: { customer: true }, orderBy: { createdAt: "desc" } }),
    db.customer.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Contracts</h1>
          <p className="text-sm text-graphite-400">Service agreements, change orders, warranties, and more.</p>
        </div>
        <NewContractForm customers={customers.map((c) => ({ id: c.id, name: c.name }))} companyName={ctx.company.name} />
      </div>

      <LegalDisclaimer compact />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-graphite-400">No contracts yet.</td></tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3">
                  <Link href={`/contracts/${c.id}`} className="text-graphite-100 hover:text-accent">{c.customer.name}</Link>
                </td>
                <td className="px-4 py-3 text-graphite-300">{typeLabel(c.type)}</td>
                <td className="px-4 py-3 text-graphite-300">{c.title}{c.fileUrl && !c.content ? " 📄" : ""}</td>
                <td className="px-4 py-3">
                  <Badge color={c.status === "SIGNED" ? "green" : c.status === "DECLINED" ? "red" : "blue"}>{c.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
