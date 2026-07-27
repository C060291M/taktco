# NovaOS

**A smarter way to build your business.** The business operating system for trade and service companies — CRM, sales, project management, and native payments in one self-contained platform.

This repo is the working MVP scaffold: sign up → brand your workspace → add a customer → send an estimate → approve it (auto-creates a job) → track the job → invoice → collect payment.

---

## 1. Run it locally

**Requirements:** Node.js 20+, Docker (for local Postgres) — or any Postgres 14+ instance you already have.

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres (skip if you're pointing at your own DB)
docker compose up -d

# 3. Set up your environment
cp .env.example .env
# open .env and set AUTH_SECRET to a random string:
# openssl rand -base64 32

# 4. Create the database tables
npm run db:push

# 5. Load demo data (a sample company, customer, estimate, job, invoice)
npm run db:seed

# 6. Run the app
npm run dev
```

Visit `http://localhost:3000` → you'll be redirected to `/login`.

**Demo login:** `owner@demo.novaos.app` / `password123` (pre-filled on the login screen).

Or click **"Create your company workspace"** on the login page to run through real onboarding as a brand-new tenant.

---

## 2. What's actually wired up in this scaffold

| Module (from the blueprint) | Status in this build |
|---|---|
| Auth + multi-tenant company workspaces | ✅ Working (custom email/password auth, no third-party auth service) |
| Branding (logo, accent color) | ✅ Working — applies live across the dashboard |
| Customers / CRM | ✅ Working — create, list, detail view, communication log (display only, no logging UI yet) |
| Sales pipeline | ✅ Working — drag-and-drop Kanban, backed by real API calls |
| Estimates | ✅ Working — dynamic line-item builder, approve/decline, **auto-creates a Job on approval** |
| Jobs | ✅ Working — status board (drag-and-drop), detail page, cost tracking |
| Invoices | ✅ Working — create, list, **payment is a local dev stub** (see below) |
| Financial dashboard | ✅ Working — revenue this month/YTD, outstanding invoices, pulled from real `Payment` records |
| Job photos | 🟡 Schema + UI shell exist; file upload to storage not wired (needs S3/R2 — see §4) |
| Marketing Engine, AI Assistant, Reporting | ⬜ Not built yet — intentionally out of MVP scope per the product blueprint |

## 3. About payments right now

`POST /api/invoices/[id]/pay` is a **local development stand-in**. It marks an invoice paid instantly with no real money movement — so you can build and test the full CRM → job → invoice loop without needing live API keys.

Before going live, that one route gets replaced with:
1. A real Stripe **Connect** account per company (`stripeConnectAccountId` is already on the `Company` model)
2. A PaymentIntent created against that connected account when a customer opens their invoice
3. A webhook handler that marks the invoice `PAID` only once Stripe confirms the charge — never directly from the button click

Everything else in the schema (the `Payment` table, invoice statuses, payout fields on `Company`) is already shaped for this — it's one focused integration, not a redesign.

## 4. Known gaps to close before this is production-ready

- **File uploads** (logo, job photos) currently take a raw URL. Wire up S3 or Cloudflare R2 with signed upload URLs.
- **Stripe Connect** for live payments (see §3).
- **Email/SMS sending** (estimate/invoice notifications to customers) isn't connected to Postmark/Twilio yet.
- **Rate limiting & input hardening** on public-facing routes before opening customer-facing approval/payment pages.
- **Tests** — none included yet; add integration tests around the estimate→job and invoice→payment flows first, since those are the trust-critical paths.

## 5. Pushing to GitHub

```bash
git init
git add .
git commit -m "NovaOS MVP scaffold"
gh repo create novaos --private --source=. --push
# or manually: git remote add origin <your-repo-url> && git push -u origin main
```

## 6. Deploying to Railway

1. Push this repo to GitHub (above).
2. In Railway: **New Project → Deploy from GitHub repo** → select `novaos`.
3. **Add a Postgres plugin** in the same Railway project — Railway will inject a `DATABASE_URL` automatically.
4. In your NovaOS service's variables, set:
   - `AUTH_SECRET` — a long random string (generate a new one for production, don't reuse your local one)
   - `NEXT_PUBLIC_APP_URL` — your Railway-provided domain (or custom domain once attached)
   - `DATABASE_URL` — usually auto-linked from the Postgres plugin; confirm it's present
5. Set the build command to `npm run build` and start command to `npm run start` (Railway usually detects this automatically from `package.json`).
6. After first deploy, run migrations against production once via Railway's shell/console:
   ```bash
   npx prisma db push
   ```
7. Visit your Railway URL — you should land on `/login`. Create your first real company from there (skip `db:seed`, that's demo data only).

Once this is confirmed working end-to-end on Railway, the next real infrastructure decision is Stripe Connect (§3) — that's the one piece that meaningfully changes once you're live vs. local.
