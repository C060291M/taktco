import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { FlagToggle } from "@/features/customers/FlagToggle";
import { EditContactInfo } from "@/features/customers/EditContactInfo";
import { DeleteCustomerButton } from "@/features/customers/DeleteCustomerButton";
import { LogCommunicationForm } from "@/features/customers/LogCommunicationForm";
import { FollowUpControl } from "@/features/customers/FollowUpControl";
import { CustomerNotesTasks } from "@/features/customers/CustomerNotesTasks";
import { CustomerTagPicker } from "@/features/customers/CustomerTagPicker";
import { CustomerStatusControls } from "@/features/customers/CustomerStatusControls";
import { ReviewsAndReferrals } from "@/features/customers/ReviewsAndReferrals";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const customer = await db.customer.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: {
      leads: true,
      estimates: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" }, include: { payments: true } },
      communications: { orderBy: { createdAt: "desc" }, take: 10 },
      notes: { orderBy: { createdAt: "desc" }, include: { author: true } },
      tasks: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
      assignedUser: true,
      reviewRequests: { orderBy: { sentAt: "desc" } },
      referralsGiven: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!customer) notFound();

  const [teamMembers, allTags, activity] = await Promise.all([
    db.user.findMany({ where: { companyId: ctx.company.id }, select: { id: true, name: true } }),
    db.tag.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    db.auditLog.findMany({
      where: { companyId: ctx.company.id, entityType: "customer", entityId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: true }
    })
  ]);

  const primaryLead = customer.leads[0] ?? null;
  const lifetimeValue = customer.invoices
    .flatMap((i) => i.payments)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-white">{customer.name}</h1>
            {customer.vip && <Badge color="yellow">VIP</Badge>}
            {customer.flagged && <Badge color="red">Flagged</Badge>}
          </div>
          <p className="text-sm text-graphite-400">
            {customer.phone || "No phone"} · {customer.email || "No email"} · {customer.address || "No address"}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <EditContactInfo customerId={customer.id} name={customer.name} email={customer.email} phone={customer.phone} address={customer.address} />
            <DeleteCustomerButton customerId={customer.id} customerName={customer.name} />
          </div>
          {customer.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(customer.address)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent hover:underline"
            >
              View on map
            </a>
          )}
        </div>
        <FlagToggle customerId={customer.id} flagged={customer.flagged} flagReason={customer.flagReason} />
      </div>

      {customer.flagged && customer.flagReason && (
        <div className="card p-4 border-red-500/40 bg-red-500/5">
          <p className="text-sm text-red-300">{customer.flagReason}</p>
        </div>
      )}

      <div className="card p-4 space-y-3">
        <CustomerStatusControls
          customerId={customer.id}
          status={customer.status}
          vip={customer.vip}
          assignedUserId={customer.assignedUserId}
          teamMembers={teamMembers}
        />
        <CustomerTagPicker
          customerId={customer.id}
          allTags={allTags}
          activeTagIds={customer.tags.map((t) => t.tagId)}
        />
      </div>

      {primaryLead && <FollowUpControl leadId={primaryLead.id} nextFollowupAt={primaryLead.nextFollowupAt} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Lifetime value</p>
          <p className="text-white font-medium">{money(lifetimeValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Assigned to</p>
          <p className="text-white font-medium">{customer.assignedUser?.name || "Unassigned"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Customer since</p>
          <p className="text-white font-medium">{new Date(customer.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Last contact</p>
          <p className="text-white font-medium">{customer.lastContactAt ? new Date(customer.lastContactAt).toLocaleDateString() : "—"}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Estimates</h2>
          {customer.estimates.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.estimates.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(e.totalAmount)}</span>
                <Badge color={e.status === "APPROVED" ? "green" : e.status === "DECLINED" ? "red" : "blue"}>{e.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Jobs</h2>
          {customer.jobs.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.jobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(j.quotedCost)} quoted</span>
                <Badge color={j.status === "COMPLETE" ? "green" : "yellow"}>{j.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Invoices</h2>
          {customer.invoices.length === 0 && <p className="text-sm text-graphite-400">None yet.</p>}
          <div className="space-y-2">
            {customer.invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(i.amount)}</span>
                <Badge color={i.status === "PAID" ? "green" : i.status === "OVERDUE" ? "red" : "yellow"}>{i.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CustomerNotesTasks customerId={customer.id} notes={customer.notes} tasks={customer.tasks} />

      <ReviewsAndReferrals
        customerId={customer.id}
        reviewRequests={customer.reviewRequests.map((r) => ({ id: r.id, platform: r.platform, status: r.status }))}
        referrals={customer.referralsGiven.map((r) => ({ id: r.id, referredName: r.referredName, status: r.status }))}
      />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-white">Communication history</h2>
        </div>
        <LogCommunicationForm customerId={customer.id} />
        <div className="space-y-3 mt-4">
          {customer.communications.length === 0 && <p className="text-sm text-graphite-400">No calls, texts, or notes logged yet.</p>}
          {customer.communications.map((c) => (
            <div key={c.id} className="text-sm border-b border-graphite-700 pb-2 last:border-0">
              <span className="text-graphite-400 text-xs uppercase">{c.type}</span> <span className="text-graphite-500 text-xs">- {new Date(c.createdAt).toLocaleDateString()}</span>
              <p className="text-graphite-200">{c.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Activity</h2>
        {activity.length === 0 && <p className="text-sm text-graphite-400">No activity recorded yet.</p>}
        <div className="space-y-2">
          {activity.map((a) => (
            <p key={a.id} className="text-xs text-graphite-400">
              <span className="text-graphite-300">{a.user?.name || "System"}</span> {a.action.replace(/_/g, " ")} ·{" "}
              {new Date(a.createdAt).toLocaleString()}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

