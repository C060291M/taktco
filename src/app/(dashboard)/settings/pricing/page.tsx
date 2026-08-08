import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import { PricingMatrixClient } from "@/features/settings/PricingMatrixClient";
import { BusinessRulesForm } from "@/features/settings/BusinessRulesForm";

export default async function PricingMatrixPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  if (ctx.user.role === "FIELD_TECH") redirect("/dashboard");

  const [categories, questions] = await Promise.all([
    db.pricingCategory.findMany({
      where: { companyId: ctx.company.id },
      orderBy: { displayOrder: "asc" },
      include: {
        items: {
          where: { parentItemId: null },
          orderBy: { displayOrder: "asc" },
          include: { addOns: { orderBy: { displayOrder: "asc" } } }
        }
      }
    }),
    db.estimatingQuestion.findMany({ where: { companyId: ctx.company.id }, orderBy: { displayOrder: "asc" } })
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Pricing Matrix</h1>
        <p className="text-sm text-graphite-400">
          Your own pricing database. The AI Estimate Builder only ever uses real prices from here - it never invents one.
        </p>
      </div>
      <BusinessRulesForm
        initial={{
          minJobPrice: ctx.company.minJobPrice ? Number(ctx.company.minJobPrice) : null,
          targetMarginPercent: ctx.company.targetMarginPercent ? Number(ctx.company.targetMarginPercent) : null,
          mobilizationFee: ctx.company.mobilizationFee ? Number(ctx.company.mobilizationFee) : null,
          fuelCharge: ctx.company.fuelCharge ? Number(ctx.company.fuelCharge) : null,
          travelCharge: ctx.company.travelCharge ? Number(ctx.company.travelCharge) : null,
          warrantyLengthMonths: ctx.company.warrantyLengthMonths
        }}
      />
      <PricingMatrixClient
        initialCategories={JSON.parse(JSON.stringify(categories))}
        initialQuestions={JSON.parse(JSON.stringify(questions))}
        canManage={ctx.user.role === "OWNER" || ctx.user.role === "ADMIN"}
        tradeType={ctx.company.tradeType}
      />
    </div>
  );
}
