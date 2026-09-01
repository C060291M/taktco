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
  return sign + "$" + Math.abs(n).toLocaleString();
}

export function ChangeOrdersPanel({ jobId, changeOrders }: { jobId: string; changeOrders: ChangeOrder[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [phoneApprovingId, setPhoneApprovingId] = useState<string | null>(null);
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

  async function sendToCustomer(id: string) {
    setSendingId(id);
    const res = await fetch("/api/change-orders/" + id + "/send", { method: "POST" });
    setSendingId(null);
    if (res.ok) {
      setSentIds(function (prev) { return { ...prev, [id]: true }; });
      router.refresh();
    }
  }

  async function approveByPhone(id: string) {
    if (!signName.trim()) return;
    setLoading(true);
    await fetch("/api/change-orders/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED", signedByName: signName })
    });
    setLoading(false);
    setPhoneApprovingId(null);
    setSignName("");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white">Change orders</h2>
        <button className="btn-secondary text-xs" onClick={function () { setOpen(function (o) { return !o; }); }}>+ New change order</button>
      </div>

      {open && (
        <form onSubmit={create} className="flex gap-2 mb-4">
          <input className="input" placeholder="What changed?" value={description} onChange={function (e) { setDescription(e.target.value); }} />
          <input className="input w-32" type="number" placeholder="$ change" value={amount} onChange={function (e) { setAmount(e.target.value); }} />
          <button className="btn-primary text-xs shrink-0" disabled={loading}>Save</button>
        </form>
      )}

      {changeOrders.length === 0 ? (
        <p className="text-sm text-graphite-400">No change orders on this job.</p>
      ) : (
        <div className="space-y-3">
          {changeOrders.map(function (co) {
            return (
              <div key={co.id} className="border-b border-graphite-700 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-graphite-100">{co.description}</span>
                  <span className={co.amountDelta >= 0 ? "text-emerald-400" : "text-red-400"}>{money(co.amountDelta)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <Badge color={co.status === "APPROVED" ? "green" : co.status === "DECLINED" ? "red" : co.status === "SENT" ? "blue" : "gray"}>{co.status}</Badge>
                  {co.status !== "APPROVED" && co.status !== "DECLINED" && phoneApprovingId !== co.id && (
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs text-accent hover:underline"
                        disabled={sendingId === co.id}
                        onClick={function () { sendToCustomer(co.id); }}
                      >
                        {sendingId === co.id ? "Sending..." : sentIds[co.id] ? "Resend to customer" : "Send to customer"}
                      </button>
                      <button className="text-xs text-graphite-500 hover:text-graphite-300" onClick={function () { setPhoneApprovingId(co.id); }}>
                        Approved by phone?
                      </button>
                    </div>
                  )}
                </div>
                {phoneApprovingId === co.id && (
                  <div className="mt-2">
                    <p className="text-[11px] text-graphite-500 mb-1">
                      This records that the customer verbally agreed - it won't have their own confirmation on file the way "Send to customer" does.
                    </p>
                    <div className="flex gap-2">
                      <input className="input text-xs" placeholder="Customer's name" value={signName} onChange={function (e) { setSignName(e.target.value); }} />
                      <button className="btn-primary text-xs shrink-0" disabled={loading || !signName.trim()} onClick={function () { approveByPhone(co.id); }}>Confirm</button>
                      <button className="btn-secondary text-xs shrink-0" onClick={function () { setPhoneApprovingId(null); }}>Cancel</button>
                    </div>
                  </div>
                )}
                {co.status === "APPROVED" && co.signedByName && (
                  <p className="text-[11px] text-graphite-500 mt-1">Approved by {co.signedByName}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
