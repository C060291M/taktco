import { redirect } from "next/navigation";
import { requireSession, getAdminReturnMarker } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { ToastContainer } from "@/components/ui/Toast";
import { CommandPalette } from "@/features/search/CommandPalette";
import { QuickActionButton } from "@/features/dashboard/QuickActionButton";
import { ReturnToAdminBanner } from "@/features/admin/ReturnToAdminBanner";
import { dashboardBackgroundStyle } from "@/lib/dashboardTheme";
import { getContrastingTextColor } from "@/lib/getContrastingTextColor";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  const isViewingAsDemo = Boolean(await getAdminReturnMarker());

  return (
    <div
      className="flex min-h-screen"
      style={{ ["--brand-accent" as string]: ctx.company.brandAccentColor, ["--brand-accent-foreground" as string]: getContrastingTextColor(ctx.company.brandAccentColor) }}
    >
      <Sidebar companyName={ctx.company.name} logoUrl={ctx.company.logoUrl} userRole={ctx.user.role} />
      <div className="flex-1 flex flex-col min-h-screen">
        {isViewingAsDemo && <ReturnToAdminBanner />}
        <TopNav userName={ctx.user.name} userRole={ctx.user.role} />
        <main
          className="flex-1 p-8 max-w-6xl"
          style={dashboardBackgroundStyle(ctx.company.dashboardTheme, ctx.company.brandAccentColor)}
        >
          {children}
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
      <QuickActionButton />
    </div>
  );
}


