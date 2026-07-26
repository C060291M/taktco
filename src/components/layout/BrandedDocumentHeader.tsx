type Company = { name: string; logoUrl: string | null; brandAccentColor: string };

// Used at the top of customer-facing documents (estimates/quotes, invoices) so they
// carry the trade business's own brand, not TAKTCO's - this is the "branded quotes and
// invoicing" piece of the customization philosophy from the blueprint.
export function BrandedDocumentHeader({ company, label }: { company: Company; label: string }) {
  return (
    <div
      className="flex items-center justify-between pb-4 mb-2 border-b-2"
      style={{ borderColor: company.brandAccentColor }}
    >
      <div className="flex items-center gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt={company.name} className="h-10 w-10 object-contain rounded" />
        ) : (
          <div
            className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: `${company.brandAccentColor}33`, color: company.brandAccentColor }}
          >
            {company.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="text-white font-medium">{company.name}</p>
      </div>
      <span
        className="text-xs font-medium uppercase tracking-wide px-2 py-1 rounded"
        style={{ backgroundColor: `${company.brandAccentColor}22`, color: company.brandAccentColor }}
      >
        {label}
      </span>
    </div>
  );
}
