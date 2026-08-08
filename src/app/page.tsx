import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { NovaBanner } from "@/components/marketing/NovaBanner";
import Link from "next/link";
import Image from "next/image";

const WORKFLOW_STEPS = [
  { step: "1", title: "Send an estimate", desc: "Describe the job in plain language and TAKTCO AI drafts the line items — or build it yourself in minutes." },
  { step: "2", title: "Customer approves", desc: "No account needed on their end. The moment they click approve, a project and starter contract are created for you automatically." },
  { step: "3", title: "Run the job", desc: "Crew assignments, daily logs, photos, punch lists — all connected to the same job, not a separate app." },
  { step: "4", title: "Get paid", desc: "Invoice pulls straight from the approved estimate. Customer pays online. Revenue updates everywhere automatically." }
];

const AI_FEATURES = [
  { title: "AI Estimate Builder, grounded in your real pricing", desc: "Type \"replace 220 feet of cedar fence\" and get a full line-item draft — priced only from your own Pricing Matrix, never a guessed number. If something's missing, it says so instead of making one up." },
  { title: "TAKTCO AI, grounded in your real data", desc: "Ask about revenue, overdue invoices, or your pipeline and get answers pulled from your actual numbers — never a guess." },
  { title: "Business Health Score", desc: "One real number, 0–100, built from 8 disclosed metrics — revenue trend, margin, win rate, and more — with an AI-written analysis of exactly what to focus on next." },
  { title: "AI Contract Builder", desc: "Describe the job, get a complete draft contract — scope, payment terms, timeline, your standard warranty — ready to review and send." },
  { title: "Automation Engine", desc: "Build rules with no code: \"Invoice paid → wait 7 days → ask for a review.\" Your business keeps working while you're on a job site." },
  { title: "Marketing AI", desc: "Turn a finished job into a Facebook post, Google Business update, or email — in your brand voice, in one click from your portfolio." },
  { title: "Daily insights, not a black box", desc: "Every alert TAKTCO surfaces — a stalled estimate, an invoice at risk — comes with the exact rule behind it. No mystery scores." }
];

const FEATURES = [
  { title: "Customer Management", desc: "Manage relationships from first contact to repeat customer — leads, follow-ups, and flags for problem clients, all in one place." },
  { title: "Your own Pricing Matrix", desc: "Build your real pricing by category — materials, labor, add-ons — with a starter template for your trade or a blank page to build from scratch." },
  { title: "Estimates & contracts", desc: "Build a quote, send it, get it approved — and it becomes a scheduled job automatically." },
  { title: "Project Management", desc: "Control every job from kickoff to completion — crew assignments, daily logs, and before/after photos." },
  { title: "Financial Management", desc: "Track revenue, invoices, payments, and profitability — pulled from real job numbers, not spreadsheets." },
  { title: "Deposits made simple", desc: "Split any approved estimate into a deposit and final balance with one click — two real, linked invoices, same payment flow." },
  { title: "Native payments", desc: "Collect customer payments directly through your own branded invoice pages." },
  { title: "Email and SMS from your own account", desc: "Connect your own Gmail, Outlook, or Twilio — your messages, your sending reputation, never shared with anyone else on the platform." },
  { title: "Your brand, not ours", desc: "Upload your logo, pick your colors, and TAKTCO looks like your software — not a rented tool." }
];

const FAQS = [
  { q: "Is this a CRM or something more?", a: "More. TAKTCO replaces the CRM, the estimating app, the invoicing tool, and the spreadsheets construction and service businesses usually stitch together — with one system." },
  { q: "Do I need a credit card to try it?", a: "No. Start your 7-day trial with just an email and password — add billing later, only if you decide to stay." },
  { q: "What happens if I run out of AI credits?", a: "Nothing breaks. You can buy more credits, connect your own OpenAI/Anthropic/Gemini key and skip TAKTCO Credits entirely, or just wait for your monthly reset." },
  { q: "Can I use my own branding?", a: "Yes — upload your logo and pick your colors during setup. Your quotes, invoices, and dashboard all carry your brand, not TAKTCO's." },
  { q: "Do I need to already use QuickBooks or another tool?", a: "No. TAKTCO is a standalone system — it doesn't require or sync with outside software to work." },
  { q: "What trades is this built for?", a: "Fencing, roofing, HVAC, electrical, plumbing, painting, landscaping, home security, gutters, solar screens, siding, windows, doors, handyman services, cleaning, and general contracting — each with its own starter Pricing Matrix template. Any other trade works too; you just build your own pricing from scratch." }
];

export default async function Home() {
  const ctx = await requireSession();
  if (ctx) redirect(ctx.user.isPlatformAdmin ? "/admin" : "/dashboard");

  return (
    <div className="min-h-screen bg-graphite-950 relative">
      <Image
        src="/taktco-logo.png"
        alt=""
        width={900}
        height={900}
        aria-hidden="true"
        className="pointer-events-none select-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] max-w-none z-0"
      />

      <div className="relative z-10">
        <NovaBanner />

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
            The Construction Business Operating System.
          </h1>
          <p className="text-graphite-300 mt-4 text-lg max-w-2xl mx-auto">
            TAKTCO connects your entire construction business in one platform — leads, customers, estimates,
            contracts, projects, crews, invoices, payments, marketing, and business analytics. One system built for contractors.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start free trial</Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">Log in</Link>
          </div>
          <p className="text-xs text-graphite-500 mt-3">7-day free trial · no credit card required</p>
          <p className="text-xs text-graphite-500 mt-4 uppercase tracking-[0.3em]">Beyond The Tape</p>
        </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-white text-center mb-2">From lead to paid, automatically</h2>
        <p className="text-graphite-400 text-center mb-10 max-w-xl mx-auto">Most software just stores what you type in. TAKTCO connects it — one step finishing is what starts the next one.</p>
        <div className="grid md:grid-cols-4 gap-5">
          {WORKFLOW_STEPS.map((s) => (
            <div key={s.step} className="card p-5">
              <span className="text-accent text-xs font-semibold">STEP {s.step}</span>
              <h3 className="text-white font-medium mt-1 mb-2">{s.title}</h3>
              <p className="text-sm text-graphite-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-white text-center mb-2">Built-in AI, not bolted on</h2>
        <p className="text-graphite-400 text-center mb-10 max-w-xl mx-auto">Every AI feature in TAKTCO is grounded in your real business data — it never invents a number, and it always shows you why.</p>
        <div className="grid md:grid-cols-2 gap-5">
          {AI_FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <h3 className="text-white font-medium mb-2">✨ {f.title}</h3>
              <p className="text-sm text-graphite-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold text-white text-center mb-10">Everything under one roof</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <h3 className="text-white font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-graphite-400">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start free trial</Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-white text-center mb-2">Simple, flat pricing</h2>
        <p className="text-graphite-400 text-center mb-10">Every plan unlocks the full platform. TAKTCO Credits and storage scale with your team.</p>
        <div className="grid md:grid-cols-3 gap-5">
          <div className="card p-6">
            <p className="text-graphite-400 text-sm uppercase tracking-wide">Starter</p>
            <p className="text-white text-3xl font-semibold mt-2">$89<span className="text-base text-graphite-400">/mo</span></p>
            <ul className="text-sm text-graphite-300 mt-4 space-y-2">
              <li>Everything unlocked</li>
              <li>1–3 users</li>
              <li>500 TAKTCO Credits/mo</li>
              <li>5 GB storage</li>
            </ul>
          </div>
          <div className="card p-6 border-accent/50 relative">
            <span className="absolute -top-3 left-6 bg-accent text-accent-foreground text-xs font-medium px-2 py-0.5 rounded">Most popular</span>
            <p className="text-graphite-400 text-sm uppercase tracking-wide">Pro</p>
            <p className="text-white text-3xl font-semibold mt-2">$129<span className="text-base text-graphite-400">/mo</span></p>
            <ul className="text-sm text-graphite-300 mt-4 space-y-2">
              <li>Everything unlocked</li>
              <li>4–6 users</li>
              <li>2,500 TAKTCO Credits/mo</li>
              <li>25 GB storage</li>
            </ul>
          </div>
          <div className="card p-6">
            <p className="text-graphite-400 text-sm uppercase tracking-wide">Corporate</p>
            <p className="text-white text-3xl font-semibold mt-2">$179<span className="text-base text-graphite-400">/mo</span></p>
            <ul className="text-sm text-graphite-300 mt-4 space-y-2">
              <li>Everything unlocked</li>
              <li>Up to 10 users</li>
              <li>5,000 TAKTCO Credits/mo</li>
              <li>100 GB storage</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-xs text-graphite-500 mt-4">Need more? Connect your own AI provider anytime and skip TAKTCO Credits entirely.</p>
        <div className="text-center mt-8">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start your free trial</Link>
          <p className="text-xs text-graphite-500 mt-3">7-day free trial · no credit card required</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-white text-center mb-10">Questions</h2>
        <div className="space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="card p-5">
              <p className="text-white font-medium mb-1">{f.q}</p>
              <p className="text-sm text-graphite-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-graphite-700 py-8 text-center text-xs text-graphite-500">
        TAKTCO — The Construction Business Operating System · Beyond The Tape
      </footer>
      </div>
    </div>
  );
}
