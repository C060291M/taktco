import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/database/client";
import { CreditPackageList } from "@/features/settings/CreditPackageList";

export default async function CreditsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const packages = await db.creditPackage.findMany({ where: { active: true }, orderBy: { credits: "asc" } });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href="/settings/ai" className="text-xs text-graphite-400 hover:text-white">← TAKTCO AI</Link>
        <h1 className="text-xl font-semibold text-white mt-2">Buy TAKTCO Credits</h1>
        <p className="text-sm text-graphite-400">Purchased credits never expire and are used after your included monthly credits.</p>
      </div>
      <CreditPackageList packages={packages.map((p) => ({ id: p.id, name: p.name, credits: p.credits, priceCents: p.priceCents }))} />
    </div>
  );
}
