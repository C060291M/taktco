import { db } from "@/database/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteCompanyButton } from "@/features/admin/DeleteCompanyButton";

export default async function AdminCompanyDetailPage({ params }: { params: { id: string } }) {
  const company = await db.company.findUnique({
    where: { id: params.id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { customers: true, jobs: true, estimates: true, invoices: true } }
    }
  });
  if (!company) notFound();

  const owner = company.users.find((u) => u.role === "OWNER") || company.users[0];
  // termsAcceptedByUserId is a plain string field, not a Prisma relation (the
  // Company model already has a distinct users[] relation to User, and this
  // is almost always the same person as owner above anyway) - resolved with
  // a direct lookup instead of an include.
  const termsAcceptedByUser = company.termsAcceptedByUserId
    ? await db.user.findUnique({ where: { id: company.termsAcceptedByUserId }, select: { name: true, email: true } })
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin" className="text-xs text-graphite-400 hover:text-white">&larr; Platform overview</Link>
        <h1 className="text-xl font-semibold text-white mt-2">{company.name}</h1>
        <p className="text-sm text-graphite-400">{company.subdomain}.novaos.app &middot; {company.tradeType || "No trade set"}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-graphite-400">Owner</dt><dd className="text-graphite-100">{owner?.name} ({owner?.email})</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Plan</dt><dd className="text-graphite-100 capitalize">{company.subscriptionTier}</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Status</dt><dd className="text-graphite-100">{company.subscriptionStatus || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Users</dt><dd className="text-graphite-100">{company.users.length}</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Customers</dt><dd className="text-graphite-100">{company._count.customers}</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Jobs</dt><dd className="text-graphite-100">{company._count.jobs}</dd></div>
            <div className="flex justify-between"><dt className="text-graphite-400">Signed up</dt><dd className="text-graphite-100">{new Date(company.createdAt).toLocaleDateString()}</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Terms of Service acceptance</h2>
          {company.termsAcceptedAt ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-graphite-400">Accepted</dt><dd className="text-graphite-100">{new Date(company.termsAcceptedAt).toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite-400">Version</dt><dd className="text-graphite-100">{company.termsAcceptedVersion}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite-400">By</dt><dd className="text-graphite-100">{termsAcceptedByUser?.name || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite-400">IP address</dt><dd className="text-graphite-100">{company.termsAcceptedIp || "-"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-graphite-400">No acceptance on record - this account predates the acceptance tracking feature.</p>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Danger zone</h2>
        <DeleteCompanyButton companyId={company.id} companyName={company.name} />
      </div>
    </div>
  );
}