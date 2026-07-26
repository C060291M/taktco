import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { InvoiceDefaultsForm } from "@/features/settings/InvoiceDefaultsForm";

export default async function InvoiceSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Invoice defaults</h1>
        <p className="text-sm text-graphite-400">Applied automatically to new invoices.</p>
      </div>
      <InvoiceDefaultsForm
        initial={{
          defaultInvoiceDueDays: ctx.company.defaultInvoiceDueDays,
          defaultLateFeePercent: ctx.company.defaultLateFeePercent ? Number(ctx.company.defaultLateFeePercent) : null,
          defaultDepositPercent: ctx.company.defaultDepositPercent ? Number(ctx.company.defaultDepositPercent) : null,
          invoiceFooterText: ctx.company.invoiceFooterText
        }}
      />
    </div>
  );
}
