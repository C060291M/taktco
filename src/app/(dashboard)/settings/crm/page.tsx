import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import Link from "next/link";
import { CrmSettingsPanel } from "@/features/settings/CrmSettingsPanel";

export default async function CrmSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const [tags, leadSources] = await Promise.all([
    db.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    db.leadSource.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } })
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">← Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">CRM settings</h1>
        <p className="text-sm text-graphite-400">Tags and lead sources used across Customers and Leads.</p>
      </div>
      <CrmSettingsPanel tags={tags} leadSources={leadSources} />
    </div>
  );
}
