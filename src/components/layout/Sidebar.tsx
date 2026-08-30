"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FileSignature,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
  BarChart3,
  Bot,
  Settings as SettingsIcon,
  Zap,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { isBlockedFrom } from "@/lib/permissions";

const NAV = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard, section: "dashboard" },
  { href: "/customers", label: "Customers", icon: Users, section: "customers" },
  { href: "/pipeline", label: "Leads", icon: Target, section: "pipeline" },
  { href: "/estimates", label: "Estimates", icon: FileText, section: "estimates" },
  { href: "/contracts", label: "Contracts", icon: FileSignature, section: "contracts" },
  { href: "/invoices", label: "Invoices", icon: DollarSign, section: "invoices" },
  { href: "/jobs", label: "Projects", icon: Building2, section: null },
  { href: "/schedule", label: "Schedule", icon: Calendar, section: null },
  { href: "/analytics", label: "Analytics", icon: BarChart3, section: "analytics" },
  { href: "/nova-ai", label: "TAKTCO AI", icon: Bot, section: null },
  { href: "/automations", label: "Automations", icon: Zap, section: "automations" },
  { href: "/settings", label: "Settings", icon: SettingsIcon, section: "settings" }
];

const GROWTH_ITEMS = [
  { href: "/portfolio", label: "Portfolio", section: null },
  { href: "/marketing", label: "Marketing AI", section: "marketing" },
  { href: "/campaigns", label: "Campaigns", section: "campaigns" }
];

export function Sidebar({ companyName, logoUrl, userRole }: { companyName: string; logoUrl?: string | null; userRole: string }) {
  const pathname = usePathname();
  const visibleNav = NAV.filter(function (item) { return !item.section || !isBlockedFrom(userRole, item.section); });
  const visibleGrowth = GROWTH_ITEMS.filter(function (item) { return !item.section || !isBlockedFrom(userRole, item.section); });
  const growthActive = visibleGrowth.some(function (g) { return pathname === g.href || pathname.startsWith(g.href + "/"); });
  const [growthOpen, setGrowthOpen] = useState(growthActive);

  const firstHalfHrefs = ["/dashboard", "/customers", "/pipeline", "/estimates", "/contracts", "/invoices", "/jobs", "/schedule"];
  const secondHalfHrefs = ["/analytics", "/nova-ai", "/automations", "/settings"];
  const firstHalf = visibleNav.filter(function (item) { return firstHalfHrefs.indexOf(item.href) !== -1; });
  const secondHalf = visibleNav.filter(function (item) { return secondHalfHrefs.indexOf(item.href) !== -1; });

  return (
    <aside className="w-60 shrink-0 bg-graphite-900 border-r border-graphite-700 min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-graphite-700 flex items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={companyName} className="h-7 w-7 rounded object-cover" />
        ) : (
          <div className="h-7 w-7 rounded bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
            {companyName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white leading-tight">{companyName}</p>
          <p className="text-[11px] text-graphite-400 leading-tight">on TAKTCO</p>
        </div>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {firstHalf.map(function (item) {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors " + (active ? "bg-graphite-700 text-white" : "text-graphite-300 hover:bg-graphite-800 hover:text-white")}
              style={active ? { boxShadow: "inset 2px 0 0 0 var(--brand-accent)" } : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
        {visibleGrowth.length > 0 ? (
          <div>
            <button
              onClick={function () { setGrowthOpen(function (o) { return !o; }); }}
              className={"w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors " + (growthActive ? "bg-graphite-700 text-white" : "text-graphite-300 hover:bg-graphite-800 hover:text-white")}
              style={growthActive ? { boxShadow: "inset 2px 0 0 0 var(--brand-accent)" } : undefined}
            >
              <span className="flex items-center gap-2.5">
                <TrendingUp size={16} className="shrink-0" />
                Growth
              </span>
              <ChevronDown size={14} className={"transition-transform " + (growthOpen ? "rotate-180" : "")} />
            </button>
            {growthOpen ? (
              <div className="pl-7 space-y-1">
                {visibleGrowth.map(function (item) {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={"block px-3 py-1.5 rounded-lg text-sm transition-colors " + (active ? "text-white" : "text-graphite-400 hover:text-white")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
        {secondHalf.map(function (item) {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors " + (active ? "bg-graphite-700 text-white" : "text-graphite-300 hover:bg-graphite-800 hover:text-white")}
              style={active ? { boxShadow: "inset 2px 0 0 0 var(--brand-accent)" } : undefined}
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
