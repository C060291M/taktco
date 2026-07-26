import { NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Every check here is derived from data that already exists - no new schema
// needed. Naturally stops appearing once everything's checked off, which is
// what "shown only for new companies" needs without a dedicated flag.
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = ctx.company.id;
  const [userCount, customerCount, estimateCount, jobCount, sentInvoiceCount, aiSettings] = await Promise.all([
    db.user.count({ where: { companyId } }),
    db.customer.count({ where: { companyId, deletedAt: null } }),
    db.estimate.count({ where: { companyId } }),
    db.job.count({ where: { companyId } }),
    db.invoice.count({ where: { companyId, status: { not: "DRAFT" } } }),
    db.companyAiSettings.findUnique({ where: { companyId } })
  ]);

  const items = [
    { key: "logo", label: "Upload your company logo", done: Boolean(ctx.company.logoUrl), linkUrl: "/settings" },
    { key: "branding", label: "Customize your brand color", done: ctx.company.brandAccentColor !== "#1EAEC4", linkUrl: "/settings" },
    { key: "stripe", label: "Connect Stripe to accept payments", done: ctx.company.payoutsEnabled, linkUrl: "/settings/payments" },
    { key: "ai", label: "Configure TAKTCO AI", done: Boolean(aiSettings), linkUrl: "/settings/ai" },
    { key: "team", label: "Add your first team member", done: userCount > 1, linkUrl: "/settings/team" },
    { key: "customer", label: "Add your first customer", done: customerCount > 0, linkUrl: "/customers" },
    { key: "estimate", label: "Create your first estimate", done: estimateCount > 0, linkUrl: "/estimates" },
    { key: "project", label: "Start your first project", done: jobCount > 0, linkUrl: "/jobs" },
    { key: "invoice", label: "Send your first invoice", done: sentInvoiceCount > 0, linkUrl: "/invoices" }
  ];

  const completedCount = items.filter((i) => i.done).length;
  return NextResponse.json({ items, completedCount, total: items.length });
}
