// Real Stripe Connect integration for payment collection.
//
// STATUS: written against the current Stripe Node SDK and documented API
// shape, but never executed - this sandbox has no internet access. Verify
// against a real test-mode Stripe account before trusting it with money:
// 1. `npm install stripe` (already in package.json)
// 2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env (test mode keys)
// 3. Run through: connect onboarding -> checkout -> webhook -> refund
// 4. Only then point it at live keys.
//
// Architecture: each TAKTCO company is a Stripe Connect Express account
// (stripeConnectAccountId on Company). Customers pay through a Checkout
// Session created "on behalf of" that connected account, so funds settle to
// the trade business's own bank account, not TAKTCO's. TAKTCO never touches
// card data directly - Stripe Checkout is hosted, so this stays PCI-light.
import Stripe from "stripe";

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

export const stripe = stripeConfigured
  ? new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2025-02-24.acacia" })
  : null;

// Creates (or reuses) a Stripe Connect Express account for a company and
// returns an onboarding link. Call once per company; store the returned
// account id on Company.stripeConnectAccountId.
export async function createConnectAccountLink(params: {
  existingAccountId: string | null;
  companyName: string;
  email: string;
  refreshUrl: string;
  returnUrl: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");

  let accountId = params.existingAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: params.email,
      business_type: "company",
      company: { name: params.companyName }
    });
    accountId = account.id;
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding"
  });

  return { accountId, url: link.url };
}

export async function isConnectAccountReady(accountId: string) {
  if (!stripe) return false;
  const account = await stripe.accounts.retrieve(accountId);
  return Boolean(account.charges_enabled && account.payouts_enabled);
}

// Creates a hosted Checkout Session for one invoice, on behalf of the
// company's connected account. Returns the URL to redirect the customer to.
export async function createInvoiceCheckoutSession(params: {
  connectedAccountId: string;
  invoiceId: string;
  amountCents: number;
  customerEmail?: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card", "us_bank_account"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: params.amountCents,
            product_data: { name: params.description }
          },
          quantity: 1
        }
      ],
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { invoiceId: params.invoiceId },
      payment_intent_data: {
        metadata: { invoiceId: params.invoiceId }
      }
    },
    { stripeAccount: params.connectedAccountId }
  );

  return { url: session.url, sessionId: session.id };
}

// Verifies and parses an incoming Stripe webhook payload. Throws on a bad
// signature - callers must return a 400 in that case, per Stripe's docs.
export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!stripe) throw new Error("Stripe is not configured.");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

// ---------- Subscription billing (TAKTCO charging its own customers) ----------
// This is platform billing, same Stripe account as credit purchases, and
// deliberately distinct from the Connect flow above (that's for a company's
// *own* customers paying *them*). Requires three Stripe Price IDs to exist in
// the dashboard first (Starter/Pro/Corporate, monthly) - set their IDs via
// STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO / STRIPE_PRICE_CORPORATE env vars.
export function priceIdForTier(tier: string): string | null {
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    corporate: process.env.STRIPE_PRICE_CORPORATE
  };
  return map[tier] || null;
}

// Reverse lookup used by the webhook, since a subscription event only gives us
// a price ID, not the tier name we store on Company.
export function tierForPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || "__unset_starter"]: "starter",
    [process.env.STRIPE_PRICE_PRO || "__unset_pro"]: "pro",
    [process.env.STRIPE_PRICE_CORPORATE || "__unset_corporate"]: "corporate"
  };
  return map[priceId] || null;
}

export const TIER_INCLUDED_CREDITS: Record<string, number> = { starter: 500, pro: 2500, corporate: 5000 };

export async function createSubscriptionCheckoutSession(params: {
  companyId: string;
  companyName: string;
  email: string;
  existingCustomerId: string | null;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) throw new Error("Stripe is not configured.");
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.existingCustomerId || undefined,
    customer_email: params.existingCustomerId ? undefined : params.email,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7, metadata: { companyId: params.companyId } },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { companyId: params.companyId }
  });
}

// The Stripe-hosted portal where a company manages their own subscription -
// upgrade/downgrade/cancel/payment method/invoice history all happen here,
// not in custom-built UI, per Stripe's own recommended pattern.
export async function createBillingPortalSession(params: { customerId: string; returnUrl: string }) {
  if (!stripe) throw new Error("Stripe is not configured.");
  return stripe.billingPortal.sessions.create({ customer: params.customerId, return_url: params.returnUrl });
}

// Refunds a payment, fully or partially, on the connected account.
export async function refundPayment(params: {
  connectedAccountId: string;
  paymentIntentId: string;
  amountCents?: number; // omit for a full refund
}) {
  if (!stripe) throw new Error("Stripe is not configured.");
  return stripe.refunds.create(
    { payment_intent: params.paymentIntentId, amount: params.amountCents },
    { stripeAccount: params.connectedAccountId }
  );
}
