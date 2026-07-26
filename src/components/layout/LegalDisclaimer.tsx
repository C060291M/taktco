export function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/5 ${compact ? "p-3" : "p-4"}`}>
      <p className={`text-amber-300 ${compact ? "text-[11px]" : "text-xs"} leading-relaxed`}>
        <strong>Not legal advice.</strong> These templates are provided as a convenience starting point only.
        TAKTCO is not a law firm, does not provide legal advice, and is not responsible or liable for the legal
        sufficiency, enforceability, or consequences of any contract created, sent, or signed using this tool.
        Review and adapt every contract for your business, trade, and state before relying on it, and consult a
        licensed attorney in your jurisdiction for anything legally binding.
      </p>
    </div>
  );
}
