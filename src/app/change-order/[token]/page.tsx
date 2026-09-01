import { db } from "@/database/client";
import { notFound } from "next/navigation";
import { PublicChangeOrderView } from "./PublicChangeOrderView";

export default async function PublicChangeOrderPage({ params }: { params: { token: string } }) {
  const changeOrder = await db.changeOrder.findUnique({
    where: { signingToken: params.token },
    include: { job: { include: { customer: true } }, company: true }
  });
  if (!changeOrder) notFound();

  return (
    <PublicChangeOrderView
      token={params.token}
      customerName={changeOrder.job.customer.name}
      company={{
        name: changeOrder.company.name,
        logoUrl: changeOrder.company.logoUrl,
        brandAccentColor: changeOrder.company.brandAccentColor,
        timeZone: changeOrder.company.timeZone
      }}
      description={changeOrder.description}
      amountDelta={Number(changeOrder.amountDelta)}
      status={changeOrder.status}
      signedByName={changeOrder.signedByName}
    />
  );
}
