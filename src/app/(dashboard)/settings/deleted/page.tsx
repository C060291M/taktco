import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import Link from "next/link";
import { DeletedItemsTable, DeletedItem } from "@/features/settings/DeletedItemsTable";

export default async function DeletedItemsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  // Restore is owner-only, same as delete on every one of these models -
  // so this whole view is gated the same way rather than showing a list
  // whose only real action a non-owner can't take.
  if (ctx.user.role !== "OWNER") redirect("/settings");

  const companyId = ctx.company.id;

  const [customers, estimates, jobs, invoices, campaigns] = await Promise.all([
    db.customer.findMany({
      where: { companyId, deletedAt: { not: null } },
      select: { id: true, name: true, email: true, deletedAt: true },
      orderBy: { deletedAt: "desc" }
    }),
    db.estimate.findMany({
      where: { companyId, deletedAt: { not: null } },
      select: { id: true, estimateNumber: true, totalAmount: true, deletedAt: true, customer: { select: { name: true } } },
      orderBy: { deletedAt: "desc" }
    }),
    db.job.findMany({
      where: { companyId, deletedAt: { not: null } },
      select: { id: true, jobNumber: true, deletedAt: true, customer: { select: { name: true } } },
      orderBy: { deletedAt: "desc" }
    }),
    db.invoice.findMany({
      where: { companyId, deletedAt: { not: null } },
      select: { id: true, invoiceNumber: true, amount: true, deletedAt: true, customer: { select: { name: true } } },
      orderBy: { deletedAt: "desc" }
    }),
    db.campaign.findMany({
      where: { companyId, deletedAt: { not: null } },
      select: { id: true, name: true, channel: true, deletedAt: true },
      orderBy: { deletedAt: "desc" }
    })
  ]);

  const items: DeletedItem[] = [
    ...customers.map(function (c) {
      return { type: "customer" as const, id: c.id, title: c.name, subtitle: c.email || "No email on file", deletedAt: c.deletedAt!.toISOString() };
    }),
    ...estimates.map(function (e) {
      return {
        type: "estimate" as const,
        id: e.id,
        title: e.estimateNumber ? `Estimate ${e.estimateNumber}` : "Estimate",
        subtitle: `${e.customer.name} Â· $${Number(e.totalAmount).toLocaleString()}`,
        deletedAt: e.deletedAt!.toISOString()
      };
    }),
    ...jobs.map(function (j) {
      return {
        type: "job" as const,
        id: j.id,
        title: j.jobNumber ? `Project ${j.jobNumber}` : "Project",
        subtitle: j.customer.name,
        deletedAt: j.deletedAt!.toISOString()
      };
    }),
    ...invoices.map(function (i) {
      return {
        type: "invoice" as const,
        id: i.id,
        title: i.invoiceNumber ? `Invoice ${i.invoiceNumber}` : "Invoice",
        subtitle: `${i.customer.name} Â· $${Number(i.amount).toLocaleString()}`,
        deletedAt: i.deletedAt!.toISOString()
      };
    }),
    ...campaigns.map(function (c) {
      return { type: "campaign" as const, id: c.id, title: c.name, subtitle: c.channel, deletedAt: c.deletedAt!.toISOString() };
    })
  ].sort(function (a, b) { return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(); });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">&larr; Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">Deleted items</h1>
        <p className="text-sm text-graphite-400">
          Customers, estimates, projects, invoices, and campaigns you've deleted. Nothing here is ever actually destroyed - restore anything back to active use.
        </p>
      </div>

      <DeletedItemsTable items={items} />
    </div>
  );
}