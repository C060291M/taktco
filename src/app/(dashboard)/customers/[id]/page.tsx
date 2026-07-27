import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const customer = await db.customer.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: {
      leads: true,
      estimates: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      communications: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{customer.name}</h1>
        <p className="text-sm text-graphite-400">
          {customer.phone || "No phone"} · {customer.email || "No email"} · {customer.address || "No address"}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Estimates</h2>
          {customer.estimates.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.estimates.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(e.totalAmount)}</span>
                <Badge color={e.status === "APPROVED" ? "green" : e.status === "DECLINED" ? "red" : "blue"}>{e.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Jobs</h2>
          {customer.jobs.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(j.quotedCost)} quoted</span>
                <Badge color={j.status === "COMPLETE" ? "green" : "yellow"}>{j.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Invoices</h2>
          {customer.invoices.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(i.amount)}</span>
                <Badge color={i.status === "PAID" ? "green" : i.status === "OVERDUE" ? "red" : "yellow"}>{i.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Communication history</h2>
        {customer.communications.length === 0 && <p className="text-sm text-graphite-400">No calls, texts, or notes logged yet.</p>}
        <div className="space-y-3">
          {customer.communications.map((c) => (
            <div key={c.id} className="text-sm border-b border-graphite-700 pb-2 last:border-0">
              <span className="text-graphite-400 text-xs uppercase">{c.type}</span>
              <p className="text-graphite-200">{c.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
