import { db } from "@/database/client";
import { notFound } from "next/navigation";
import { PublicEstimateView } from "./PublicEstimateView";

export default async function PublicEstimatePage({ params }: { params: { token: string } }) {
  const estimate = await db.estimate.findUnique({
    where: { approvalToken: params.token },
    include: { customer: true, company: true }
  });
  if (!estimate) notFound();

  if (!estimate.viewedAt && estimate.status === "SENT") {
    await db.estimate.update({ where: { id: estimate.id }, data: { viewedAt: new Date(), status: "VIEWED" } });
  }

  const lineItems = estimate.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[];

  return (
    <PublicEstimateView
      token={params.token}
      customerName={estimate.customer.name}
      company={{ name: estimate.company.name, logoUrl: estimate.company.logoUrl, brandAccentColor: estimate.company.brandAccentColor, timeZone: estimate.company.timeZone }}
      status={estimate.status}
      totalAmount={Number(estimate.totalAmount)}
      lineItems={lineItems}
      warranty={estimate.warranty}
      terms={estimate.terms}
      displayMode={estimate.displayMode}
      validUntil={estimate.validUntil ? estimate.validUntil.toISOString() : null}
    />
  );
}


