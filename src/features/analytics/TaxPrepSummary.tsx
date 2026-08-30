"use client";
import { useState } from "react";

export function TaxPrepSummary() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 6; y--) yearOptions.push(y);

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-white mb-1">Tax Prep Summary</h2>
      <p className="text-xs text-graphite-400 mb-4">
        An itemized export of paid invoices and tax collected for a calendar year - ready to hand to your accountant. This is not tax advice and does not include expenses, payroll, or deductions.
      </p>
      <div className="flex items-center gap-2">
        <select className="input w-28" value={year} onChange={function (e) { setYear(Number(e.target.value)); }}>
          {yearOptions.map(function (y) {
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
        <a href={"/api/reports/tax-summary?year=" + year} className="btn-primary text-sm">
          Download PDF
        </a>
      </div>
    </div>
  );
}
