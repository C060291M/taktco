import { db } from "@/database/client";
import { notFound } from "next/navigation";
import { PublicContractView } from "./PublicContractView";

export default async function PublicContractPage({ params }: { params: { token: string } }) {
  const contract = await db.contract.findUnique({
    where: { signingToken: params.token },
    include: { customer: true, company: true }
  });
  if (!contract) notFound();

  return (
    <PublicContractView
      token={params.token}
      customerName={contract.customer.name}
      company={{ name: contract.company.name, logoUrl: contract.company.logoUrl, brandAccentColor: contract.company.brandAccentColor }}
      title={contract.title}
      content={contract.content}
      status={contract.status}
      signedByName={contract.signedByName}
    />
  );
}
