"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUIStore } from "@/store/uiStore";

const LABELS: Record<string, string> = {
  dashboard: "Command Center",
  customers: "Customers",
  pipeline: "Leads",
  estimates: "Estimates",
  contracts: "Contracts",
  invoices: "Invoices",
  jobs: "Projects",
  portfolio: "Portfolio",
  marketing: "Marketing AI",
  campaigns: "Campaigns",
  analytics: "Analytics",
  "nova-ai": "TAKTCO AI",
  automations: "Automations",
  settings: "Settings",
  team: "Team",
  payments: "Payments",
  crm: "CRM Settings",
  ai: "TAKTCO AI",
  billing: "Billing",
  credits: "Buy Credits"
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const breadcrumbLabels = useUIStore((s) => s.breadcrumbLabels);
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-sm text-graphite-400">
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = LABELS[seg] || breadcrumbLabels[seg] || seg;
        return (
          <span key={href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-graphite-600">/</span>}
            {isLast ? (
              <span className="text-white">{label}</span>
            ) : (
              <Link href={href} className="hover:text-white">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}



