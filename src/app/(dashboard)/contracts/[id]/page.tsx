import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { BrandedDocumentHeader } from "@/components/layout/BrandedDocumentHeader";
import { LegalDisclaimer } from "@/components/layout/LegalDisclaimer";
import { CONTRACT_TYPES } from "@/lib/contractTemplates";
import { ContractActions } from "@/features/contracts/ContractActions";
import { PrintButton } from "@/components/ui/PrintButton";
import { CopyContractLink } from "@/features/contracts/CopyContractLink";
import { ContractContentEditor } from "@/features/contracts/ContractContentEditor";

function typeLabel(type: string) {
  return CONTRACT_TYPES.find((t) => t.value === type)?.label || type;
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const contract = await db.contract.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true }
  });
  if (!contract) notFound();
  const canManage = ctx.user.role === "OWNER" || ctx.user.role === "ADMIN";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5 print-document">
        <BrandedDocumentHeader company={ctx.company} label={typeLabel(contract.type)} />
        <div className="pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{contract.title}</h1>
            <p className="text-sm text-graphite-400">For {contract.customer.name}{contract.customer.address ? ` - ${contract.customer.address}` : ""} - Status: {contract.status}</p>
          </div>
          <div className="flex gap-2">
            <PrintButton />
            <CopyContractLink token={contract.signingToken} />
          </div>
        </div>

        {contract.fileUrl ? (
          <a
            href={contract.fileUrl}
            download={contract.fileName || "contract"}
            className="btn-secondary inline-block"
          >
            Download {contract.fileName || "document"}
          </a>
        ) : (
          <ContractContentEditor
            contractId={contract.id}
            content={contract.content}
            canEdit={canManage && contract.status === "DRAFT"}
          />
        )}

        {contract.status === "SIGNED" && contract.signedByName && (
          <div className="mt-4">
            <p className="text-sm text-emerald-400">
              Signed by {contract.signedByName} on {new Date(contract.signedAt!).toLocaleDateString()}
            </p>
            {contract.ipAddress && <p className="text-[11px] text-graphite-500 mt-1">IP address on file: {contract.ipAddress}</p>}
          </div>
        )}
      </div>

      <LegalDisclaimer />

      <ContractActions contractId={contract.id} status={contract.status} />
    </div>
  );
}

