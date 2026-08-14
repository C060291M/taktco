import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { verifyWebhookSignature, isConnectAccountReady, tierForPriceId, TIER_INCLUDED_CREDITS } from "@/services/stripe";
import { notify } from "@/lib/notify";
import { logError } from "@/lib/errorLog";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";
import Stripe from "stripe";

// Stripe webhook endpoint. Configure this URL (https://yourapp.com/api/webhooks/stripe)
// in the Stripe Dashboard, listening for: account.updated, checkout.session.completed,
// payment_intent.payment_failed, charge.refunded.
//
// STATUS: written against Stripe's current webhook event shapes, never received
// a real event - no internet in this sandbox. Test with the Stripe CLI
// (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) before
// trusting this in production.
//
// The invoice-paid PDF/email block below (inside checkout.session.completed)
// is UNTESTED end-to-end - it can't be exercised until a real Stripe Connect
// account finishes onboarding and a real payment triggers this webhook. The
// logic mirrors the already-working contract/estimate PDF flows, but treat
// it as unverified until a real payment confirms it.
function pdfFilenameFor(label: string) {
  return label.replace(/[^a-z0-9]+/gi, "_") + "_paid.pdf";
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature) as Stripe.Event;
  } catch (err) {
    await logError({
      module: "STRIPE",
      severity: "HIGH",
      message: `Webhook signature verification failed: ${err instanceof Error ? err.message : "Invalid signature"}`,
      route: "/api/webhooks/stripe",
      recoveryAction: "Rejected with 400, event not processed."
    });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const ready = await isConnectAccountReady(account.id);
      const company = await db.company.findFirst({ where: { stripeConnectAccountId: account.id } });
      if (company && ready && company.verificationStatus !== "VERIFIED") {
        await db.company.update({
          where: { id: company.id },
          data: { verificationStatus: "VERIFIED", payoutsEnabled: true }
        });
        await db.auditLog.create({
          data: { companyId: company.id, action: "verification_completed_stripe", entityType: "company", entityId: company.id }
        });
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const invoiceId = session.metadata?.invoiceId;
      const purchaseId = session.metadata?.purchaseId;
      const subscriptionCompanyId = session.metadata?.companyId;

      if (session.mode === "subscription" && subscriptionCompanyId) {
        await db.company.update({
          where: { id: subscriptionCompanyId },
          data: {
            stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined
          }
        });
        // Authoritative tier/status/period-end sync happens in the
        // customer.subscription.created/updated handlers below, which fire
        // right after this and carry the actual price/period data.
      }

      if (invoiceId) {
        const invoice = await db.invoice.findUnique({ where: { id: invoiceId }, include: { customer: true, company: true } });
        if (invoice && invoice.status !== "PAID") {
          await db.payment.create({
            data: {
              companyId: invoice.companyId,
              invoiceId: invoice.id,
              amount: invoice.amount,
              method: "card",
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
              status: "succeeded"
            }
          });
          const paidAt = new Date();
          await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
          await notify({
            companyId: invoice.companyId,
            category: "INVOICE_PAID",
            title: `Payment received from ${invoice.customer.name}`,
            body: `$${Number(invoice.amount).toLocaleString()} paid via Stripe.`,
            linkUrl: `/invoices/${invoice.id}`
          });

          // UNTESTED - see file header. Mirrors the working contract/estimate
          // PDF flows; not yet exercised by a real payment.
          try {
            const lineItems = invoice.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[];
            const pdfBuffer = await generateInvoicePdf({
              companyName: invoice.company.name,
              customerName: invoice.customer.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: Number(invoice.amount),
              taxAmount: Number(invoice.taxAmount || 0),
              lineItems,
              paidAt,
              paymentMethod: "card"
            });
            const label = invoice.invoiceNumber || "invoice";
            const filename = pdfFilenameFor(label);

            if (invoice.customer.email) {
              await sendTrackedEmail({
                companyId: invoice.companyId,
                customerId: invoice.customerId,
                toEmail: invoice.customer.email,
                subject: `Payment received - your receipt from ${invoice.company.name}`,
                html: brandedEmail({
                  companyName: invoice.company.name,
                  logoUrl: invoice.company.logoUrl,
                  accentColor: invoice.company.brandAccentColor,
                  heading: "Payment received - here's your receipt",
                  bodyHtml: `Thank you for your payment. A PDF receipt is attached for your records.`
                }),
                kind: "invoice_paid_confirmation",
                attachments: [{ filename, content: pdfBuffer }]
              });
            }

            if (invoice.company.businessEmail) {
              await sendTrackedEmail({
                companyId: invoice.companyId,
                toEmail: invoice.company.businessEmail,
                subject: `${invoice.customer.name} paid their invoice`,
                html: brandedEmail({
                  companyName: invoice.company.name,
                  logoUrl: invoice.company.logoUrl,
                  accentColor: invoice.company.brandAccentColor,
                  heading: "Invoice paid",
                  bodyHtml: `${invoice.customer.name} just paid their invoice. A copy is attached.`
                }),
                kind: "invoice_paid_company_copy",
                attachments: [{ filename, content: pdfBuffer }]
              });
            }
          } catch (err) {
            console.error("Failed to generate/send paid invoice PDF:", err);
          }
        }
      }

      if (purchaseId) {
        const purchase = await db.creditPurchase.findUnique({ where: { id: purchaseId } });
        if (purchase && purchase.status !== "completed") {
          await db.creditPurchase.update({ where: { id: purchase.id }, data: { status: "completed" } });
          const wallet = await db.aiCreditWallet.findUnique({ where: { companyId: purchase.companyId } });
          if (wallet) {
            await db.aiCreditWallet.update({ where: { companyId: purchase.companyId }, data: { purchasedCredits: { increment: purchase.credits } } });
          } else {
            await db.aiCreditWallet.create({
              data: {
                companyId: purchase.companyId,
                purchasedCredits: purchase.credits,
                cycleResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }
            });
          }
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : undefined;
      if (paymentIntentId) {
        const payment = await db.payment.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
        if (payment) {
          const refundedAmount = charge.amount_refunded / 100;
          await db.payment.update({
            where: { id: payment.id },
            data: {
              refundedAmount,
              refundedAt: new Date(),
              status: charge.refunded ? "refunded" : "partially_refunded"
            }
          });
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = priceId ? tierForPriceId(priceId) : null;

      const company = companyId
        ? await db.company.findUnique({ where: { id: companyId } })
        : await db.company.findFirst({ where: { stripeSubscriptionId: subscription.id } });
      if (!company) break;

      await db.company.update({
        where: { id: company.id },
        data: {
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
          ...(tier ? { subscriptionTier: tier } : {})
        }
      });

      if (tier && subscription.status === "active") {
        const wallet = await db.aiCreditWallet.findUnique({ where: { companyId: company.id } });
        const included = TIER_INCLUDED_CREDITS[tier] || 500;
        if (wallet) {
          await db.aiCreditWallet.update({
            where: { companyId: company.id },
            data: { includedCredits: included, usedThisCycle: 0, cycleResetAt: new Date(subscription.items.data[0].current_period_end * 1000) }
          });
        } else {
          await db.aiCreditWallet.create({
            data: { companyId: company.id, includedCredits: included, cycleResetAt: new Date(subscription.items.data[0].current_period_end * 1000) }
          });
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const company = await db.company.findFirst({ where: { stripeSubscriptionId: subscription.id } });
      if (company) {
        await db.company.update({ where: { id: company.id }, data: { subscriptionStatus: "canceled" } });
      }
      break;
    }

    case "invoice.payment_failed": {
      const stripeInvoice = event.data.object as Stripe.Invoice;
      const customerId = typeof stripeInvoice.customer === "string" ? stripeInvoice.customer : undefined;
      if (customerId) {
        const company = await db.company.findFirst({ where: { stripeCustomerId: customerId } });
        if (company) {
          await notify({
            companyId: company.id,
            category: "SYSTEM_ANNOUNCEMENT",
            title: "Your TAKTCO subscription payment failed",
            body: "Update your payment method in Settings -> Billing to avoid losing access.",
            linkUrl: "/settings/billing"
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
