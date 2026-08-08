export const metadata = { title: "Terms of Service | TAKTCO" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-graphite-950 py-16 px-6">
      <div className="max-w-2xl mx-auto prose prose-invert">
        <h1 className="text-2xl font-semibold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-graphite-500 mb-8">Last updated: August 2026</p>

        <p className="text-graphite-300">
          TAKTCO is a subscription software platform for construction and service businesses. By creating an
          account, you agree to these terms.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">The service</h2>
        <p className="text-graphite-300">
          TAKTCO provides tools for managing leads, customers, estimates, contracts, projects, invoices, and
          related business communications. New accounts include a 7-day free trial; no payment is required to
          start a trial.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Your responsibilities</h2>
        <p className="text-graphite-300">
          You are responsible for the accuracy of information you enter into TAKTCO, including your own
          customers' contact information, and for how you use TAKTCO to communicate with them. You must have a
          lawful basis for contacting anyone you add as a customer. You may not use TAKTCO for unlawful purposes
          or to send unsolicited marketing messages to people without an existing relationship with your
          business.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Billing</h2>
        <p className="text-graphite-300">
          Subscriptions are billed monthly through Stripe. You can upgrade, downgrade, or cancel at any time
          through your account's Billing settings. Cancelling stops future billing; it does not retroactively
          refund the current billing period unless required by law.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">AI features</h2>
        <p className="text-graphite-300">
          TAKTCO includes AI-assisted features (estimate drafting, marketing content generation, business
          insights). AI output should be reviewed before being sent to your customers or relied upon for business
          decisions — AI can make mistakes, and you remain responsible for what you ultimately send or act on.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Limitation of liability</h2>
        <p className="text-graphite-300">
          TAKTCO is provided as a tool to help run your business. We are not responsible for the accuracy of
          estimates, contracts, or other content you create or send using the platform, or for business decisions
          made based on TAKTCO's data or AI features.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Account cancellation</h2>
        <p className="text-graphite-300">
          You may cancel your account at any time. Data associated with a cancelled account may be retained for a
          reasonable period before deletion, in accordance with our Privacy Policy.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">SMS Messaging Program</h2>
        <p className="text-graphite-300">
          <strong>Program name:</strong> TAKTCO Customer Notifications.
        </p>
        <p className="text-graphite-300">
          <strong>Description:</strong> Businesses using TAKTCO may send their own customers transactional SMS
          messages related to an existing service relationship - including invoices, payment reminders,
          appointment/job scheduling updates, and review requests.
        </p>
        <p className="text-graphite-300">
          <strong>Message frequency:</strong> Message frequency varies based on your activity with the business
          (for example, around invoices, scheduled appointments, or completed jobs) - typically a few messages
          per project, not a recurring subscription.
        </p>
        <p className="text-graphite-300">
          <strong>Message and data rates may apply.</strong> Carrier message and data rates may apply to any SMS
          you receive.
        </p>
        <p className="text-graphite-300">
          <strong>Support:</strong> Reply <strong>HELP</strong> to any message for support, or contact the
          business directly. To stop receiving messages, reply <strong>STOP</strong> at any time.
        </p>

        <p className="text-graphite-500 text-xs mt-12 border-t border-graphite-700 pt-4">
          These terms describe TAKTCO's actual current service. They have not yet been reviewed by legal counsel
          and should be treated as a working draft pending that review.
        </p>
      </div>
    </div>
  );
}
