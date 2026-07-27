import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewCustomerForm } from "./NewCustomerForm";

export default async function CustomersPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const customers = await db.customer.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-graphite-400">Every lead and customer in one place.</p>
        </div>
        <NewCustomerForm />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-graphite-400">
                  No customers yet. Add your first one to start your pipeline.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-graphite-100 hover:text-accent">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-graphite-300">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-graphite-300">{c.email || "—"}</td>
                <td className="px-4 py-3 text-graphite-300">{c.source || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
