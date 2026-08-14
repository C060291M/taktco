"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContractActions({
  contractId,
  status,
  companySignedByName
}: {
  contractId: string;
  status: string;
  companySignedByName: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signedByName, setSignedByName] = useState("");
  const [companySigning, setCompanySigning] = useState(false);
  const [companySignerName, setCompanySignerName] = useState("");

  async function setStatus(newStatus: string, extra?: Record<string, string>) {
    setLoading(true);
    await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...extra })
    });
    setLoading(false);
    router.refresh();
  }

  async function signAsCompany() {
    setLoading(true);
    await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companySignedByName: companySignerName })
    });
    setLoading(false);
    setCompanySigning(false);
    setCompanySignerName("");
    router.refresh();
  }

  async function sendToClient() {
    setSending(true);
    setSendResult(null);
    const res = await fetch(`/api/contracts/${contractId}/send`, { method: "POST" });
    const result = await res.json();
    setSending(false);
    if (res.ok && result.sent) {
      setSendResult("Sent to the customer's email for signature.");
      router.refresh();
    } else {
      setSendResult(result.reason || result.error || "Send failed.");
    }
  }

  if (status === "SIGNED") return null;
  if (status === "DECLINED") return <p className="text-sm text-red-400">This contract was declined.</p>;

  if (signing) {
    return (
      <div className="card p-5 space-y-3">
        <p className="text-sm text-white font-medium">Record an offline signature</p>
        <p className="text-xs text-graphite-400">
          Only use this if the client signed on paper or verbally agreed and you're recording it manually.
          For a real remote signature, use "Send to client for signature" instead. Typing a name here is a
          simple typed signature, not a verified e-signature.
        </p>
        <input
          className="input"
          placeholder="Type full name to sign"
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setSigning(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={loading || !signedByName.trim()}
            onClick={() => setStatus("SIGNED", { signedByName })}
          >
            {loading ? "Signing..." : "Sign"}
          </button>
        </div>
      </div>
    );
  }

  if (!companySignedByName) {
    if (companySigning) {
      return (
        <div className="card p-5 space-y-3">
          <p className="text-sm text-white font-medium">Sign as your company</p>
          <p className="text-xs text-graphite-400">
            Your company must sign this contract before it can be sent to the client. Typing a name here is a
            simple typed signature, not a verified e-signature.
          </p>
          <input
            className="input"
            placeholder="Type your full name"
            value={companySignerName}
            onChange={(e) => setCompanySignerName(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setCompanySigning(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={loading || !companySignerName.trim()}
              onClick={signAsCompany}
            >
              {loading ? "Signing..." : "Sign"}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="card p-5 space-y-3">
        <p className="text-sm text-white font-medium">Your company hasn't signed this contract yet</p>
        <p className="text-xs text-graphite-400">
          Sign as your company before sending this to the client for their signature.
        </p>
        <button className="btn-primary" onClick={() => setCompanySigning(true)}>Sign as company</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <button className="btn-primary" disabled={sending} onClick={sendToClient}>
          {sending ? "Sending..." : "Send to client for signature"}
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => setSigning(true)}>
          Record offline signature
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => setStatus("DECLINED")}>Decline</button>
      </div>
      {sendResult && <p className="text-xs text-graphite-400">{sendResult}</p>}
    </div>
  );
}
