import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import Link from "next/link";
import { TeamTable } from "@/features/settings/TeamTable";
import { AddTeammateForm } from "@/features/settings/AddTeammateForm";

export default async function TeamSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  if (ctx.user.role !== "OWNER" && ctx.user.role !== "ADMIN") redirect("/settings");

  const users = await db.user.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true }
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">← Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">Team</h1>
        <p className="text-sm text-graphite-400">Who has access to {ctx.company.name}, and what they can do.</p>
      </div>

      <AddTeammateForm canGrantOwner={ctx.user.role === "OWNER"} />

      <TeamTable users={users} currentUserId={ctx.user.id} canManageOwners={ctx.user.role === "OWNER"} />

      <div className="card p-4">
        <p className="text-xs text-graphite-400">
          <span className="text-graphite-300 font-medium">Owner</span> — full access, billing, branding, team management. ·{" "}
          <span className="text-graphite-300 font-medium">Admin</span> — everything except billing and removing owners. ·{" "}
          <span className="text-graphite-300 font-medium">Sales Rep</span> — CRM and Sales only. ·{" "}
          <span className="text-graphite-300 font-medium">Field Tech</span> — assigned jobs only, no pricing visibility.
        </p>
      </div>
    </div>
  );
}
