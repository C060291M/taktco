import Link from "next/link";
import {
  Building2, Users, Bot, FileText, DollarSign, Bell, Megaphone, Lock, CreditCard, Tag, Wallet
} from "lucide-react";

const SETTINGS_NAV = [
  { href: "/settings", label: "Company & Branding", icon: Building2 },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/ai", label: "TAKTCO AI", icon: Bot },
  { href: "/settings/estimates", label: "Estimate Defaults", icon: FileText },
  { href: "/settings/invoices", label: "Invoice Defaults", icon: DollarSign },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/marketing", label: "Marketing", icon: Megaphone },
  { href: "/settings/security", label: "Security", icon: Lock },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/settings/crm", label: "CRM", icon: Tag },
  { href: "/settings/payments", label: "Payment Collection", icon: Wallet }
];

// The Company Control Center shell - every /settings/* page renders inside
// this. Individual pages stay focused on their own section; this is just the
// consistent sub-navigation around all of them. Deliberately NOT listing
// every section from the original 14-item spec - only sections with real
// content behind them, per the "no placeholder text" QA standard from a
// prior phase. Dashboard Customization lives on the Command Center itself
// (a "Customize" control there, not here) since that's the more natural
// place a user would look for it.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8 items-start">
      <nav className="w-52 shrink-0 space-y-1 sticky top-8">
        {SETTINGS_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-graphite-300 hover:bg-graphite-800 hover:text-white transition-colors"
            >
              <Icon size={15} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
