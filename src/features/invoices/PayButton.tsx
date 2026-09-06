"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// Legacy DEPOSIT/FINAL_BALANCE invoices (kind !== STANDARD) keep the old
// single "Mark as paid" button. STANDARD invoices show a real chooser:
// Deposit + Full before anything's paid, collapsing to just Remaining once
// a deposit is in.
export function PayButton({
  invoiceId,
  disabled,
  kind,
  amount,
  totalPaid,
  depositPercent
}: {
  invoiceId: string;
  disabled?: boolean;
  kind: string;
  amount: number;
  totalPaid: number;
  depositPercent: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function pay(choice?: "deposit" | "full" | "remaining") {
    setLoading(choice || "legacy");
    await fetch(`/api/invoices/${invoiceId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(choice ? { choice } : {})
    });
    setLoading(null);
    router.refresh();
  }

  if (disabled) {
    return (
      <button className="btn-secondary text-xs opacity-40 cursor-not-allowed" disabled title="Verify your business in Settings first">
        Mark as paid
      </button>
    );
  }

  if (kind !== "STANDARD") {
    return (
      <button className="btn-secondary text-xs" disabled={!!loading} onClick={() => pay()}>
        {loading ? "Processing..." : "Mark as paid"}
      </button>
    );
  }

  const remaining = Math.max(0, amount - totalPaid);
  const depositAmount = depositPercent ? Math.round(amount * (depositPercent / 100) * 100) / 100 : null;

  if (totalPaid > 0) {
    return (
      <button className="btn-secondary text-xs" disabled={!!loading} onClick={() => pay("remaining")}>
        {loading ? "Processing..." : `Pay Remaining (${money(remaining)})`}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      {depositAmount !== null && (
        <button className="btn-secondary text-xs" disabled={!!loading} onClick={() => pay("deposit")}>
          {loading === "deposit" ? "Processing..." : `Pay Deposit (${money(depositAmount)})`}
        </button>
      )}
      <button className="btn-primary text-xs" disabled={!!loading} onClick={() => pay("full")}>
        {loading === "full" ? "Processing..." : `Pay in Full (${money(amount)})`}
      </button>
    </div>
  );
}