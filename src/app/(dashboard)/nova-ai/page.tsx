import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NovaChat } from "@/features/nova-ai/NovaChat";

export default async function NovaAiPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-xl font-semibold text-white">TAKTCO AI</h1>
        <p className="text-sm text-graphite-400">Ask about revenue, leads, follow-ups, or anything else in your business.</p>
      </div>
      <NovaChat companyName={ctx.company.name} />
    </div>
  );
}
