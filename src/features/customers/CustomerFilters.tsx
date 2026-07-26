"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["lead", "Lead"],
  ["estimate_pending", "Estimate Pending"],
  ["estimate_sent", "Estimate Sent"],
  ["negotiation", "Negotiation"],
  ["active", "Active Customer"],
  ["completed", "Completed"],
  ["repeat_customer", "Repeat Customer"],
  ["problem_client", "Problem Client"],
  ["inactive", "Inactive"],
  ["archived", "Archived"]
];

export function CustomerFilters({ tags }: { tags: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", q);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={submitSearch}>
        <input
          className="input w-56"
          placeholder="Search name, email, phone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <select
        className="input w-44"
        value={searchParams.get("status") || ""}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select
        className="input w-36"
        value={searchParams.get("tagId") || ""}
        onChange={(e) => updateParam("tagId", e.target.value)}
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <button
        type="button"
        className={`btn-secondary text-xs ${searchParams.get("vip") === "true" ? "border-amber-400 text-amber-300" : ""}`}
        onClick={() => updateParam("vip", searchParams.get("vip") === "true" ? "" : "true")}
      >
        VIP only
      </button>
      <button
        type="button"
        className={`btn-secondary text-xs ${searchParams.get("flagged") === "true" ? "border-red-400 text-red-300" : ""}`}
        onClick={() => updateParam("flagged", searchParams.get("flagged") === "true" ? "" : "true")}
      >
        Flagged only
      </button>
    </div>
  );
}
