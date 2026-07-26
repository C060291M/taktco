"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type ReviewRequest = { id: string; platform: string; status: string };
type Referral = { id: string; referredName: string; status: string };

export function ReviewsAndReferrals({
  customerId,
  reviewRequests,
  referrals
}: {
  customerId: string;
  reviewRequests: ReviewRequest[];
  referrals: Referral[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState("GOOGLE");
  const [referredName, setReferredName] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReview() {
    setLoading(true);
    await fetch("/api/review-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, platform })
    });
    setLoading(false);
    router.refresh();
  }

  async function logReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!referredName.trim()) return;
    setLoading(true);
    await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referringCustomerId: customerId, referredName })
    });
    setLoading(false);
    setReferredName("");
    router.refresh();
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Review requests</h2>
        <div className="flex gap-2 mb-3">
          <select className="input text-xs" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="GOOGLE">Google</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="YELP">Yelp</option>
            <option value="CUSTOM">Custom link</option>
          </select>
          <button className="btn-secondary text-xs shrink-0" disabled={loading} onClick={requestReview}>Request review</button>
        </div>
        {reviewRequests.length === 0 ? (
          <p className="text-sm text-graphite-400">None sent yet.</p>
        ) : (
          <div className="space-y-1">
            {reviewRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-300">{r.platform}</span>
                <Badge color={r.status === "COMPLETED" ? "green" : r.status === "IGNORED" ? "red" : "gray"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Referrals given</h2>
        <form onSubmit={logReferral} className="flex gap-2 mb-3">
          <input className="input text-xs" placeholder="Referred person's name" value={referredName} onChange={(e) => setReferredName(e.target.value)} />
          <button className="btn-secondary text-xs shrink-0" disabled={loading}>Log</button>
        </form>
        {referrals.length === 0 ? (
          <p className="text-sm text-graphite-400">No referrals logged yet.</p>
        ) : (
          <div className="space-y-1">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-300">{r.referredName}</span>
                <Badge color={r.status === "CONVERTED" ? "green" : "gray"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
