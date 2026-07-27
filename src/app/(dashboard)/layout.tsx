import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div
      className="flex min-h-screen bg-graphite-950"
      style={{ ["--brand-accent" as string]: ctx.company.brandAccentColor }}
    >
      <Sidebar companyName={ctx.company.name} logoUrl={ctx.company.logoUrl} />
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
