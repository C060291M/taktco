import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { stripe } from "@/services/stripe";

// One-time fix: directly sets the test DOB and SSN on the account
// representative via API, satisfying the card_payments requirement without
// needing to re-run Stripe's hosted onboarding UI.
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe || !ctx.company.stripeConnectAccountId) {
    return NextResponse.json({ error: "No Stripe account connected." }, { status: 400 });
  }

  const persons = await stripe.accounts.listPersons(ctx.company.stripeConnectAccountId);
  const person = persons.data[0];
  if (!person) return NextResponse.json({ error: "No person found on this account." }, { status: 400 });

  const updated = await stripe.accounts.updatePerson(ctx.company.stripeConnectAccountId, person.id, {
    dob: { day: 1, month: 1, year: 1902 },
    ssn_last_4: "0000"
  });

  const account = await stripe.accounts.retrieve(ctx.company.stripeConnectAccountId);

  return NextResponse.json({
    personUpdated: updated.id,
    capabilities: account.capabilities,
    requirements: account.requirements
  });
}

