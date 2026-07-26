import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import Link from "next/link";
import { DemoLoginButton } from "@/features/admin/DemoLoginButton";

// Platform-level admin, separate from the tenant dashboard on purpose - this sees
// data ACROSS companies, so it must never share a layout, nav, or accent-color
// styling with the tenant-scoped (dashboard) route group. Gated on isPlatformAdmin,
// which nothing in the product sets automatically - see README for how to flag
// yourself as one manually.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  if (!ctx.user.isPlatformAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-graphite-950">
      <header className="border-b border-graphite-700 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">TAKTCO <span className="text-red-400">Admin Console</span></p>
          <p className="text-xs text-graphite-500">Platform-wide — visible to platform admins only</p>
        </div>
        <div className="flex items-center gap-4">
          <DemoLoginButton />
          <Link href="/dashboard" className="text-xs text-graphite-400 hover:text-white">← Back to your workspace</Link>
        </div>
      </header>
      <nav className="border-b border-graphite-700 px-8 flex gap-4">
        <Link href="/admin" className="text-sm text-graphite-300 hover:text-white py-3">Overview</Link>
        <Link href="/admin/health" className="text-sm text-graphite-300 hover:text-white py-3">Platform Health</Link>
        <Link href="/admin/errors" className="text-sm text-graphite-300 hover:text-white py-3">Errors</Link>
      </nav>
      <main className="p-8 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
