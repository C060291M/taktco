export const metadata = { title: "Privacy Policy | TAKTCO" };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-graphite-950 py-16 px-6">
      <div className="max-w-2xl mx-auto prose prose-invert">
        <h1 className="text-2xl font-semibold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-graphite-500 mb-8">Last updated: August 2026</p>

        <p className="text-graphite-300">
          TAKTCO ("we," "our," or "the platform") provides business management software for construction and
          service contractors. This policy describes what information we collect, how we use it, and who we
          share it with.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Information we collect</h2>
        <p className="text-graphite-300">
          When a business signs up for TAKTCO, we collect the business's own information (company name, contact
          details, branding). When that business uses TAKTCO to manage their own customers, they may enter their
          customers' contact information (name, email, phone, address) directly into the platform. TAKTCO also
          stores job photos, contracts, and other documents the business uploads.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">How we use information</h2>
        <p className="text-graphite-300">
          Information is used to operate the platform: displaying a business's own data back to them, sending
          transactional communications on a business's behalf to their own customers (estimates, invoices,
          appointment reminders, review requests), and processing payments.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Third parties we share data with</h2>
        <ul className="text-graphite-300">
          <li><strong>Stripe</strong> — payment processing and subscription billing. We do not store full card numbers.</li>
          <li><strong>Resend</strong> — sending transactional email on behalf of businesses using TAKTCO.</li>
          <li><strong>Twilio</strong> — sending transactional SMS on behalf of businesses using TAKTCO.</li>
          <li><strong>AI providers</strong> (Anthropic, OpenAI, or another provider a business connects their own key to) — job and business descriptions are sent to generate AI-drafted content (estimates, marketing copy). Customer contact information is not included in these requests.</li>
          <li><strong>Cloud storage providers</strong> (Cloudflare R2 or AWS S3, where configured) — storing uploaded photos and documents.</li>
        </ul>
        <p className="text-graphite-300">We do not sell personal information, and we do not use customer contact information for our own marketing purposes.</p>

        <h2 className="text-white text-lg mt-8 mb-2">SMS and email communications</h2>
        <p className="text-graphite-300">
          Businesses using TAKTCO may send their own customers transactional SMS and email (invoices, appointment
          updates, review requests). These messages relate to an existing service relationship between the
          business and their customer. A customer who no longer wishes to receive SMS can reply STOP at any time.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Data retention and deletion</h2>
        <p className="text-graphite-300">
          Data is retained for as long as an account is active. A business can request deletion of their account
          and associated data by contacting us.
        </p>

        <h2 className="text-white text-lg mt-8 mb-2">Contact</h2>
        <p className="text-graphite-300">Questions about this policy can be sent to the contact address listed on our site.</p>

        <p className="text-graphite-500 text-xs mt-12 border-t border-graphite-700 pt-4">
          This policy describes TAKTCO's actual current data practices. It has not yet been reviewed by legal
          counsel and should be treated as a working draft pending that review.
        </p>
      </div>
    </div>
  );
}
