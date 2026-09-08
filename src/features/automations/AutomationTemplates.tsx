"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Pre-built workflows so a new company isn't staring at a blank slate. Each
// template posts to the same POST /api/automations endpoint the manual
// builder uses - no special-casing server-side. Once created, a template
// becomes a completely normal workflow: editable, testable, and
// enable/disable-able like any other.
type Template = {
  key: string;
  name: string;
  description: string;
  trigger: string;
  triggerLabel: string;
  steps: string[];
  actions: { type: string; config: Record<string, unknown> }[];
};

const TEMPLATES: Template[] = [
  {
    key: "post-job-followup",
    name: "Post-Job Follow-Up",
    description: "Turn a finished job into a review, a referral, and repeat business - without remembering to send anything.",
    trigger: "PROJECT_COMPLETED",
    triggerLabel: "When a project is marked Complete",
    steps: [
      "Wait 3 days, then ask for a review",
      "Wait 4 more days, then ask for a referral",
      "Wait 23 more days, then check in for future work"
    ],
    actions: [
      { type: "DELAY", config: { days: 3 } },
      {
        type: "SEND_EMAIL",
        config: {
          subject: "How did we do?",
          heading: "Thanks for your business!",
          message: "We hope you're happy with how everything turned out. If you have a minute, we'd really appreciate a quick review - it helps other homeowners find us and means a lot to our small team."
        }
      },
      { type: "DELAY", config: { days: 4 } },
      {
        type: "SEND_EMAIL",
        config: {
          subject: "Know anyone else who needs work done?",
          heading: "Thanks again!",
          message: "If you know a neighbor, friend, or family member who could use our help, we'd be grateful for the introduction. Most of our work comes from referrals from customers like you."
        }
      },
      { type: "DELAY", config: { days: 23 } },
      {
        type: "SEND_EMAIL",
        config: {
          subject: "We're here whenever you need us",
          heading: "Checking in",
          message: "It's been about a month since we wrapped up your project. If anything needs attention, or you're planning your next project, just reply to this email - we're always happy to help."
        }
      }
    ]
  },
  {
    key: "new-lead-response",
    name: "Fast New-Lead Response",
    description: "Reach out the moment a lead comes in, and make sure someone follows up if they go quiet.",
    trigger: "LEAD_CREATED",
    triggerLabel: "When a new lead is created",
    steps: [
      "Immediately email the lead",
      "Wait 2 days, then create a follow-up task for your team"
    ],
    actions: [
      {
        type: "SEND_EMAIL",
        config: {
          subject: "Thanks for reaching out",
          heading: "We got your request",
          message: "Thanks for getting in touch. We've received your request and someone from our team will reach out shortly to talk through the details and get you a quote."
        }
      },
      { type: "DELAY", config: { days: 2 } },
      { type: "CREATE_TASK", config: { title: "Follow up with new lead - no response yet" } }
    ]
  },
  {
    key: "payment-thank-you",
    name: "Payment Thank-You",
    description: "A simple thank-you after an invoice is paid in full - small touch, real goodwill.",
    trigger: "INVOICE_PAID",
    triggerLabel: "When an invoice is paid",
    steps: ["Immediately send a thank-you email"],
    actions: [
      {
        type: "SEND_EMAIL",
        config: {
          subject: "Payment received - thank you!",
          heading: "Thanks for your payment",
          message: "Just confirming we've received your payment. Thank you for your business - it was a pleasure working with you."
        }
      }
    ]
  }
];

export function AutomationTemplates({ existingTriggers }: { existingTriggers: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function useTemplate(t: Template) {
    setBusy(t.key);
    setError(null);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, trigger: t.trigger, conditions: [], actions: t.actions })
    });
    setBusy(null);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(function () { return {}; });
      setError(data.error || "Couldn't create that automation.");
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Start from a template
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !busy && setOpen(false)}>
      <div className="card w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="text-white font-medium">Start from a template</h2>
          <p className="text-xs text-graphite-400 mt-1">
            Ready-made workflows you can use as-is or edit afterward. Adding one creates a normal automation you can disable or delete anytime.
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="space-y-3">
          {TEMPLATES.map(function (t) {
            const alreadyHas = existingTriggers.includes(t.trigger);
            return (
              <div key={t.key} className="border border-graphite-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-graphite-400 mt-1">{t.description}</p>
                    <p className="text-[11px] text-accent mt-2">{t.triggerLabel}</p>
                    <ul className="mt-2 space-y-1">
                      {t.steps.map(function (s, i) {
                        return <li key={i} className="text-[11px] text-graphite-400">{i + 1}. {s}</li>;
                      })}
                    </ul>
                  </div>
                  <button
                    className="btn-primary text-xs shrink-0"
                    disabled={busy === t.key}
                    onClick={() => useTemplate(t)}
                  >
                    {busy === t.key ? "Adding..." : "Use this"}
                  </button>
                </div>
                {alreadyHas && (
                  <p className="text-[11px] text-amber-400/80 mt-2">
                    You already have an automation on this trigger - adding this will run both.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-secondary text-xs" disabled={!!busy} onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}