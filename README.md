# TAKTCO — Beyond The Tape

**The Construction Business Operating System.** Built for contractors to manage customers, projects, finances, and growth from one platform — CRM, sales, contracts, projects, marketing, AI assistance, analytics, and native payments in one self-contained system.

This repo is a working build: sign up → brand your workspace → add a customer → send an estimate → approve it (auto-creates a job) → track the job with photos → invoice → collect payment. Plus contracts, campaigns, AI-generated marketing content, an AI business assistant, and a platform-level admin view.

---

## 1. Run it locally

**Requirements:** Node.js 20+, and a Postgres 14+ database (local via Docker, or a free cloud one like Neon).

```bash
# 1. Install dependencies
npm install

# 2. Point at a Postgres database
cp .env.example .env
# Either: docker compose up -d   (local Postgres, matches DATABASE_URL in .env.example)
# Or: paste a cloud Postgres connection string (e.g. from neon.tech) into DATABASE_URL

# 3. Set your session secret
# open .env and set AUTH_SECRET to a random string:
# openssl rand -base64 32

# 4. Create the database tables
npm run db:push

# 5. Load demo data (a sample company, customer, estimate, job, invoice)
npm run db:seed

# 6. Run the app
npm run dev
```

Visit `http://localhost:3000` → the public landing page. Logged-out visitors see marketing; logged-in visitors get redirected straight to their dashboard.

**Demo login:** `owner@demo.novaos.app` / `password123`. No longer pre-filled on the login screen — the fastest way in is the **"🧪 Open demo account"** button in the top-right of the Admin Console (`/admin`), which switches your session to the demo tenant with one click. Requires being signed in as a platform admin first (see below).

Or click **"Start free trial"** to run through real onboarding as a brand-new tenant — drag-and-drop logo upload, brand color picker, and all.

---

## 2. AI features (Marketing AI + TAKTCO AI Assistant) need one extra step

Two modules call the Anthropic API directly and need a real key to do anything:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

Add that to `.env` and restart `npm run dev`. Without it, both features fail gracefully with a clear on-screen error pointing back here — nothing crashes, they just can't generate anything.

- **Marketing AI** (`/marketing`) — generates Facebook/Instagram/Google Business/LinkedIn posts and blog articles in your brand voice, using your company name, trade, and service area.
- **TAKTCO AI** (`/nova-ai`) — a chat assistant grounded in your actual business data (revenue, leads, follow-ups, outstanding invoices) pulled fresh from the database on every message, so it can't invent numbers.

Both were built and reviewed without internet access, so the AI calls themselves are unverified end-to-end — the code path is correct, but the first real test of "does the API call actually work" happens once you add a key on a machine with internet access. If something breaks, check the browser console and the `npm run dev` terminal output first.

## 3. Platform admin (`/admin`) — owner-of-TAKTCO-itself view

There's a separate, cross-tenant admin view at `/admin` showing every company on the platform (total companies, total users, signups this month, a table of recent companies). It's intentionally **not** linked from anywhere in the product and nothing grants it automatically — you flag a user as a platform admin manually:

```bash
npm run db:studio
```

**Real platform admin account:** run `npm run db:seed-admin` once — this creates a dedicated internal company ("TAKTCO HQ", excluded from every platform stat) and a real admin user, separate from the throwaway `db:seed` demo data. See `prisma/seed-admin.ts` for exactly what it creates; the password is set there and should be changed after first login.

**Flagging any other account as admin manually:** this opens Prisma's data browser in your regular web browser. Find your user in the `User` table, set `isPlatformAdmin` to `true`, save, and visit `/admin` while logged in as that user. Do **not** flag the demo account (`owner@demo.novaos.app`) this way in anything other than a throwaway local database — treat platform admin access the same as a production secret.

---

## 4. What's built

| Module | Status |
|---|---|
| Auth + multi-tenant company workspaces | ✅ Custom email/password auth, no third-party auth service |
| Branding (logo, colors, background style) | ✅ Drag-and-drop logo upload, custom color picker, 3 dashboard background styles |
| Landing page + signup | ✅ Public marketing page, registration collects branding upfront |
| CRM (customers, pipeline, follow-ups, flags) | ✅ Drag-and-drop pipeline board, communication log, follow-up reminders, problem-client flags |
| Estimates | ✅ Line-item builder, approve/decline, **auto-creates a Job on approval** |
| Contracts | ✅ Fillable templates (6 types) or upload your own PDF/DOC; typed-name signature stub; legal disclaimer throughout |
| Jobs & Portfolio | ✅ Status board, cost tracking, before/progress/after photo uploads, auto-built company-wide portfolio gallery |
| Invoices & payments | ✅ Payment collection gated behind a verification step (Settings → Payment collection); **actual charge is a local dev stub** — see §5 |
| Team / permissions | ✅ Add teammates, change roles, remove access; owner-only protections against lockout |
| Marketing AI | 🟡 Built, needs `ANTHROPIC_API_KEY` — see §2 |
| Campaigns (email/SMS) | 🟡 Built, **send is a local stub** — no Postmark/Twilio wired, see §5 |
| TAKTCO AI Assistant | 🟡 Built, needs `ANTHROPIC_API_KEY` — see §2 |
| Analytics | ✅ Closing rate, average job value, repeat customer rate, revenue chart, profit by project |
| Platform admin | ✅ Built, manual opt-in only — see §3 |

## 5. Stubs to replace before going live

These are working, honestly-labeled placeholders, not bugs — each one tells you in the UI that it's a stub:

- **Payments** (`/api/invoices/[id]/pay`) — marks an invoice paid instantly, no real money moves. Replace with a real Stripe Connect PaymentIntent + webhook (the `Payment` table and `stripeConnectAccountId`/`payoutsEnabled` fields are already shaped for this).
- **Campaign sending** (`/api/campaigns/[id]/send`) — marks a campaign sent and counts recipients, delivers nothing. Wire up Postmark (email) and Twilio (SMS).
- **Contract signatures** — a typed name + timestamp, not a verified e-signature. Swap in HelloSign or DocuSign before relying on this for anything binding.
- **File uploads** (logos, contracts, job photos) — stored as base64 directly in Postgres. Fine for a demo, not for scale — move to S3 or Cloudflare R2 with signed upload URLs.
- **Platform admin metrics** — MRR/ARR/churn aren't shown because they need real Stripe Billing subscription data, which isn't connected. What's there is computed straight from the database.

## 6. Pushing to GitHub

```bash
git init
git add .
git commit -m "TAKTCO"
gh repo create novaos --private --source=. --push
# or manually: git remote add origin <your-repo-url> && git push -u origin main
```

## 7. Deploying to Railway

1. Push this repo to GitHub (above).
2. In Railway: **New Project → Deploy from GitHub repo** → select `novaos`.
3. **Add a Postgres plugin** in the same Railway project — Railway will inject a `DATABASE_URL` automatically.
4. In your TAKTCO service's variables, set:
   - `AUTH_SECRET` — a long random string (generate a new one for production, don't reuse your local one)
   - `NEXT_PUBLIC_APP_URL` — your Railway-provided domain
   - `ANTHROPIC_API_KEY` — if you want Marketing AI / TAKTCO AI live
   - `DATABASE_URL` — usually auto-linked from the Postgres plugin; confirm it's present
5. Build command `npm run build`, start command `npm run start` (Railway usually auto-detects both from `package.json`).
6. After first deploy, run migrations once via Railway's shell/console:
   ```bash
   npx prisma db push
   ```
7. Visit your Railway URL — you should land on the public landing page. Sign up for your first real company from there (skip `db:seed`, that's demo data only).

Once confirmed working end-to-end on Railway, the next real infrastructure decisions are Stripe Connect and a real email/SMS provider (§5) — those are the pieces that meaningfully change once you're live vs. local.
