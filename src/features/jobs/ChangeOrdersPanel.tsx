"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type ChangeOrder = {
  id: string;
  description: string;
  amountDelta: number;
  status: string;
  signedByName: string | null;
};

function money(n: number) {
  const sign = n < 0 ? "-" : "+";
  return `${sign}$${Math.abs(n).toLocaleString()}`;
}

export function ChangeOrdersPanel({ jobId, changeOrders }: { jobId: string; changeOrders: ChangeOrder[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signName, setSignName] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    setLoading(true);
    const res = await fetch("/api/change-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, description, amountDelta: Number(amount) })
    });
    setLoading(false);
    if (res.ok) {
      setDescription("");
      setAmount("");
      setOpen(false);
      router.refresh();
    }
  }

  async function approve(id: string) {
    if (!signName.trim()) return;
    setLoading(true);
    await fetch(`/api/change-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED", signedByName: signName })
    });
    setLoading(false);
    setSigningId(null);
    setSignName("");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white">Change orders</h2>
        <button className="btn-secondary text-xs" onClick={() => setOpen((o) => !o)}>+ New change order</button>
      </div>

      {open && (
        <form onSubmit={create} className="flex gap-2 mb-4">
          <input className="input" placeholder="What changed?" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="input w-32" type="number" placeholder="$ change" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button className="btn-primary text-xs shrink-0" disabled={loading}>Save</button>
        </form>
      )}

      {changeOrders.length === 0 ? (
        <p className="text-sm text-graphite-400">No change orders on this job.</p>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => (
            <div key={co.id} className="border-b border-graphite-700 last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-graphite-100">{co.description}</span>
                <span className={co.amountDelta >= 0 ? "text-emerald-400" : "text-red-400"}>{money(co.amountDelta)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <Badge color={co.status === "APPROVED" ? "green" : co.status === "DECLINED" ? "red" : "gray"}>{co.status}</Badge>
                {co.status !== "APPROVED" && co.status !== "DECLINED" && signingId !== co.id && (
                  <button className="text-xs text-accent hover:underline" onClick={() => setSigningId(co.id)}>Approve</button>
                )}
              </div>
              {signingId === co.id && (
                <div className="flex gap-2 mt-2">
                  <input className="input text-xs" placeholder="Type name to approve" value={signName} onChange={(e) => setSignName(e.target.value)} />
                  <button className="btn-primary text-xs shrink-0" disabled={loading || !signName.trim()} onClick={() => approve(co.id)}>Confirm</button>
                </div>
              )}
              {co.status === "APPROVED" && co.signedByName && (
                <p className="text-[11px] text-graphite-500 mt-1">Approved by {co.signedByName}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
