"use client";

// Real "PDF" path: browser print-to-PDF against a print-optimized stylesheet
// (see globals.css @media print), not a server-rendered binary. Chosen
// deliberately over adding a PDF rendering library (puppeteer/@react-pdf) -
// this has zero new dependencies and works today; a true server-generated
// PDF is still a reasonable future upgrade if/when there's a real need
// (e.g. emailing a PDF attachment) that this can't cover.
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary no-print text-sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}
