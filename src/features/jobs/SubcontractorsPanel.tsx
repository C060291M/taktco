"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Payment = { id: string; amount: number; paidAt: string; method: string | null; note: string | null };
type Sub = { id: string; name: string; trade: string | null; scope: string; agreedAmount: number; contractId: string | null; payments: Payment[] };

function money(n: number) {
  return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function SubcontractorsPanel({ jobId, subs, allSubs }: { jobId: string; subs: Sub[]; allSubs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [trade, setTrade] = useState("");
  const [scope, setScope] = useState("");
  const [amount, setAmount] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNote, setPayNote] = useState("");

  async function call(url: string, method: string, body?: unknown): Promise<{ id?: string } | null> {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || "Something went wrong.");
        return null;
      }
      router.refresh();
      return d;
    } catch {
      setErr("Network error. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function addSub() {
    const d = await call("/api/jobs/" + jobId + "/subcontracts", "POST", {
      subcontractorId: pick || undefined,
      newName: pick ? undefined : newName,
      trade: pick ? undefined : trade,
      scope,
      agreedAmount: Number(amount || 0)
    });
    if (d) {
      setAdding(false); setPick(""); setNewName(""); setTrade(""); setScope(""); setAmount("");
    }
  }

  async function addPayment(id: string) {
    const d = await call("/api/job-subcontracts/" + id + "/payments", "POST", {
      amount: Number(payAmt), paidAt: payDate || undefined, method: payMethod || undefined, note: payNote || undefined
    });
    if (d) {
      setPayFor(null); setPayAmt(""); setPayDate(""); setPayMethod(""); setPayNote("");
    }
  }

  async function draftContract(id: string) {
    const d = await call("/api/job-subcontracts/" + id + "/contract", "POST");
    if (d && d.id) router.push("/contracts/" + d.id);
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Subcontractors</h2>
        <button type="button" className="btn-secondary text-xs" onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "+ Add subcontractor"}</button>
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}

      {adding && (
        <div className="space-y-2 border border-graphite-700 rounded-lg p-3">
          <select className="input w-full" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">+ New subcontractor</option>
            {allSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {!pick && (
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Name / company" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="input" placeholder="Trade (e.g. Fencing)" value={trade} onChange={(e) => setTrade(e.target.value)} />
            </div>
          )}
          <textarea className="input w-full" rows={3} placeholder="Scope of work they are doing" value={scope} onChange={(e) => setScope(e.target.value)} />
          <input className="input w-full" type="number" min="0" step="0.01" placeholder="Agreed amount they charge us ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button type="button" className="btn-primary text-xs" disabled={busy || (!pick && !newName.trim())} onClick={addSub}>Add to job</button>
        </div>
      )}

      {subs.length === 0 && !adding && <p className="text-sm text-graphite-400">No subcontractors on this job yet.</p>}

      {subs.map((s) => {
        const paid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        const owed = s.agreedAmount - paid;
        return (
          <div key={s.id} className="border border-graphite-700 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white font-medium">{s.name}{s.trade ? " - " + s.trade : ""}</p>
                {s.scope && <p className="text-xs text-graphite-400 whitespace-pre-line">{s.scope}</p>}
              </div>
              <button type="button" className="text-[11px] text-graphite-500 hover:text-red-400" onClick={() => { if (confirm("Remove " + s.name + " from this job?")) call("/api/job-subcontracts/" + s.id, "DELETE"); }}>Remove</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-graphite-400">Agreed</p><p className="text-graphite-100">{money(s.agreedAmount)}</p></div>
              <div><p className="text-graphite-400">Paid</p><p className="text-graphite-100">{money(paid)}</p></div>
              <div><p className="text-graphite-400">Still owed</p><p className={owed < 0 ? "text-red-400" : "text-graphite-100"}>{money(owed)}</p></div>
            </div>
            {s.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs text-graphite-300">
                <span>{new Date(p.paidAt).toLocaleDateString()} - {money(p.amount)}{p.method ? " (" + p.method + ")" : ""}{p.note ? " - " + p.note : ""}</span>
                <button type="button" className="text-graphite-500 hover:text-red-400" onClick={() => { if (confirm("Delete this payment?")) call("/api/job-subcontracts/" + s.id + "/payments?paymentId=" + p.id, "DELETE"); }}>x</button>
              </div>
            ))}
            {payFor === s.id ? (
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" min="0" step="0.01" placeholder="Amount paid" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
                <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                <input className="input" placeholder="Method (check, ACH...)" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
                <input className="input" placeholder="Note" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                <button type="button" className="btn-primary text-xs" disabled={busy || !payAmt} onClick={() => addPayment(s.id)}>Save payment</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setPayFor(null)}>Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setPayFor(s.id)}>Record payment</button>
                {s.contractId ? (
                  <Link href={"/contracts/" + s.contractId} className="btn-secondary text-xs">Open subcontract</Link>
                ) : (
                  <button type="button" className="btn-secondary text-xs" disabled={busy} onClick={() => draftContract(s.id)}>Draft subcontract agreement</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}