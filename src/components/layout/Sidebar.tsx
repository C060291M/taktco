"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/estimates", label: "Estimates" },
  { href: "/jobs", label: "Jobs" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" }
];

export function Sidebar({ companyName, logoUrl }: { companyName: string; logoUrl?: string | null }) {
  const pathname = usePathname();

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
          <p className="text-[11px] text-graphite-400 leading-tight">on NovaOS</p>
        </div>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-graphite-700 text-white" : "text-graphite-300 hover:bg-graphite-800 hover:text-white"
              }`}
              style={active ? { boxShadow: "inset 2px 0 0 0 var(--brand-accent)" } : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-graphite-700">
        <LogoutButton />
      </div>
    </aside>
  );
}

function LogoutButton() {
  return (
    <button
      className="text-xs text-graphite-400 hover:text-white"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
