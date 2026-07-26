import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";

// Groups results by type rather than one flat list - the command palette
// renders each group with its own header. Kept intentionally simple (no
// search index/service) since Postgres ILIKE across a handful of tables is
// plenty fast at this scale; revisit only if search volume ever justifies it.
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ groups: [] });

  const companyId = ctx.company.id;
  const contains = { contains: q, mode: "insensitive" as const };

  const [customers, estimates, invoices, contracts, jobs] = await Promise.all([
    db.customer.findMany({
      where: { companyId, deletedAt: null, OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      take: 5,
      select: { id: true, name: true, email: true }
    }),
    db.estimate.findMany({
      where: { companyId, customer: { name: contains } },
      take: 5,
      include: { customer: true }
    }),
    db.invoice.findMany({
      where: { companyId, OR: [{ invoiceNumber: contains }, { customer: { name: contains } }] },
      take: 5,
      include: { customer: true }
    }),
    db.contract.findMany({
      where: { companyId, OR: [{ title: contains }, { customer: { name: contains } }] },
      take: 5,
      include: { customer: true }
    }),
    db.job.findMany({
      where: { companyId, customer: { name: contains } },
      take: 5,
      include: { customer: true }
    })
  ]);

  const groups = [
    {
      label: "Customers",
      items: customers.map((c) => ({ id: c.id, title: c.name, subtitle: c.email || "", url: `/customers/${c.id}` }))
    },
    {
      label: "Estimates",
      items: estimates.map((e) => ({ id: e.id, title: `Estimate for ${e.customer.name}`, subtitle: `$${Number(e.totalAmount).toLocaleString()}`, url: `/estimates/${e.id}` }))
    },
    {
      label: "Invoices",
      items: invoices.map((i) => ({ id: i.id, title: `Invoice for ${i.customer.name}`, subtitle: i.invoiceNumber || "", url: `/invoices/${i.id}` }))
    },
    {
      label: "Contracts",
      items: contracts.map((c) => ({ id: c.id, title: c.title, subtitle: c.customer.name, url: `/contracts/${c.id}` }))
    },
    {
      label: "Projects",
      items: jobs.map((j) => ({ id: j.id, title: `Project for ${j.customer.name}`, subtitle: j.status.replace(/_/g, " "), url: `/jobs/${j.id}` }))
    }
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups });
}
