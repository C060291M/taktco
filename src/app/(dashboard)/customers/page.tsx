import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { NewCustomerForm } from "@/features/customers/NewCustomerForm";
import { CustomerFilters } from "@/features/customers/CustomerFilters";
import type { Prisma } from "@prisma/client";

export default async function CustomersPage({
  searchParams
}: {
  searchParams: { q?: string; status?: string; tagId?: string; flagged?: string; vip?: string; page?: string };
}) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const PAGE_SIZE = 25;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const q = searchParams.q?.trim();
  const where: Prisma.CustomerWhereInput = {
    companyId: ctx.company.id,
    deletedAt: null,
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.flagged === "true" ? { flagged: true } : {}),
    ...(searchParams.vip === "true" ? { vip: true } : {}),
    ...(searchParams.tagId ? { tags: { some: { tagId: searchParams.tagId } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [customers, allTags, totalCount] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } } },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE
    }),
    db.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    db.customer.count({ where })
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-graphite-400">Every lead and customer in one place.</p>
        </div>
        <NewCustomerForm />
      </div>

      <CustomerFilters tags={allTags} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-graphite-400">
                  {q || searchParams.status || searchParams.tagId || searchParams.flagged || searchParams.vip
                    ? "No customers match those filters."
                    : "No customers yet. Add your first one to start your pipeline."}
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="text-graphite-100 hover:text-accent inline-flex items-center gap-2">
                    {c.name}
                    {c.vip && <Badge color="yellow">VIP</Badge>}
                    {c.flagged && <Badge color="red">Flagged</Badge>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-graphite-300">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-graphite-300">{c.email || "—"}</td>
                <td className="px-4 py-3 text-graphite-300 capitalize">{c.status.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span
                        key={t.tagId}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium border"
                        style={{ borderColor: t.tag.color, color: t.tag.color }}
                      >
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-graphite-400">
            Page {page} of {totalPages} · {totalCount} customer{totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) } as Record<string, string>).toString()}`}
                className="btn-secondary text-xs"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) } as Record<string, string>).toString()}`}
                className="btn-secondary text-xs"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
