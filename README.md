![Notoria](./public/logo.png)

# Notoria

**Private language learning workspaces**  
Vocabulary · Theory · Writing · Exercises · Listening · Speaking  
Owned by you · Scoped by language · Optional AI

![Live — www.notoria.fi](https://img.shields.io/badge/Live-www.notoria.fi-f7a501?style=for-the-badge&labelColor=23251d)   ![Sign up](https://img.shields.io/badge/Start_free-Sign_up-2c8c66?style=for-the-badge&labelColor=23251d)

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0A0A0A)![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square&labelColor=1a1a1a)![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat-square&logo=stripe&logoColor=white)![OpenAI](https://img.shields.io/badge/OpenAI-AI-412991?style=flat-square&logo=openai&logoColor=white)![Locales](https://img.shields.io/badge/i18n-EN_·_FI_·_SV_·_VI-2c84e0?style=flat-square)

![About](https://img.shields.io/badge/About-23251d?style=flat-square)![Features](https://img.shields.io/badge/Features-2c8c66?style=flat-square)![Plans](https://img.shields.io/badge/Plans-f7a501?style=flat-square&labelColor=23251d)![Setup](https://img.shields.io/badge/Setup-2c84e0?style=flat-square)![Config](https://img.shields.io/badge/Config-5e6a72?style=flat-square)![Privacy](https://img.shields.io/badge/Privacy-5e6a72?style=flat-square)![Contact](https://img.shields.io/badge/Contact-2c84e0?style=flat-square)

---

## What is Notoria?

Notoria is a **private** language-learning product — not a social network. No public profiles, sharing feeds, or multiplayer classrooms.

|                                                                                                                                                                 |                                                                                                                                                                               |                                                                                                                                                                        |                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Owned data](https://img.shields.io/badge/Owned_data-2c8c66?style=for-the-badge&labelColor=23251d) Words, notes, drafts, and sessions stay on **your** account | ![Per language](https://img.shields.io/badge/Per_language-2c84e0?style=for-the-badge&labelColor=23251d) One workspace per language — English, Finnish, Swedish, Vietnamese, … | ![Your material](https://img.shields.io/badge/Your_material-f7a501?style=for-the-badge&labelColor=23251d) Exercises drill _your_ vocabulary — not a generic dictionary | ![Optional AI](https://img.shields.io/badge/Optional_AI-635BFF?style=for-the-badge&labelColor=23251d) Free daily allowance · Pro toolkit · Premium Learning Coach |

> **Who it’s for:** learners who want a structured personal study space — lexicon → theory → drills → production → listening/speaking — with optional AI and clear data ownership.

---

## Key features

|                                                                                      | Module                | Highlights                                                                                                                               |
| :----------------------------------------------------------------------------------: | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
|          ![](https://img.shields.io/badge/-Vocab-2c8c66?style=flat-square)           | **Vocabulary**        | Meanings, examples, tags, POS, learning status (`NEW` → `MASTERED`). SRS via flashcards. CSV export free; PDF/DOCX + file import on Pro. |
| ![](https://img.shields.io/badge/-Drills-f7a501?style=flat-square&labelColor=23251d) | **Exercises**         | Flashcards, fill-blank, multiple choice, match pairs, type-answer from your words. Pro: AI contextual drills + **Form a Sentence**.      |
|          ![](https://img.shields.io/badge/-Theory-2c84e0?style=flat-square)          | **Theory**            | TipTap notebook for grammar, usage, culture. Category filters. PDF/DOCX import & export on Pro.                                          |
|          ![](https://img.shields.io/badge/-Write-cd4239?style=flat-square)           | **Writing**           | Rich documents and question-set worksheets. Pro AI: Check / Improve / Grammar. PDF/DOCX export on Pro.                                   |
|          ![](https://img.shields.io/badge/-Listen-635BFF?style=flat-square)          | **Listening** _(Pro)_ | Upload audio/video → AssemblyAI transcript → OpenAI practice. Sticky player linked to transcript.                                        |
|          ![](https://img.shields.io/badge/-Speak-412991?style=flat-square)           | **Speaking**          | Live AI video tutor (Stream + OpenAI Realtime). Transcript + feedback. Tutor calls metered on Free.                                      |

### AI & personalization

| Tier                                                                                        | What’s included                                                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| ![Free](https://img.shields.io/badge/Free-5e6a72?style=flat-square)                         | Small daily quotas (speaking tutor, listening transcript, exercise gen, vocab helpers, writing support)                   |
| ![Pro](https://img.shields.io/badge/Pro-2c84e0?style=flat-square)                           | Higher / unlimited lightweight AI; listening practice generation; AI practice from imported worksheets                    |
| ![Premium](https://img.shields.io/badge/Premium-f7a501?style=flat-square&labelColor=23251d) | Learning Coach on `/coach` — next-move recommendations, Ask Coach chat, progress views, attention cues from real activity |

Quotas use the **UTC calendar day** (reset 00:00 UTC). Stripe is the source of truth for paid status; the server reserves usage before AI calls and refunds on provider failure.

### Account & access

|                |                                                                         |
| -------------- | ----------------------------------------------------------------------- |
| **Auth**       | Email/password + **Google OAuth** (Auth.js) · Forgot / reset via Resend |
| **Account**    | Profile, password, avatar, billing, **account backup**                  |
| **UI locales** | English · Finnish · Swedish · Vietnamese                                |

---

## How Notoria works

```mermaid
flowchart LR
  A[Onboard workspace] --> B[Vocab + Theory]
  B --> C[Practice drills]
  C --> D[Write · Listen · Speak]
  D --> E[Optional Premium Coach]

  style A fill:#23251d,stroke:#f7a501,color:#eeefe9
  style B fill:#2c8c66,stroke:#1e5c44,color:#fff
  style C fill:#f7a501,stroke:#8a5c00,color:#23251d
  style D fill:#2c84e0,stroke:#1a5a9a,color:#fff
  style E fill:#635BFF,stroke:#3d37a8,color:#fff
```

Everything scopes to the **active workspace** (cookie). Modules share that language context so drills stay aligned with what you saved.

---

## Plans at a glance

Daily limits and prices live in [`src/lib/billing/plans.ts`](src/lib/billing/plans.ts) (`PLAN_DAILY_QUOTAS`). Subscribe from `/account`.

| Capability                                 | ![Free](https://img.shields.io/badge/Free-5e6a72?style=flat-square) | ![Pro](https://img.shields.io/badge/Pro_€9.99-2c84e0?style=flat-square) | ![Premium](https://img.shields.io/badge/Premium_€19.99-f7a501?style=flat-square&labelColor=23251d) |
| ------------------------------------------ | :-----------------------------------------------------------------: | :---------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------: |
| Core vocab / writing / theory / CSV export |                                  ✓                                  |                                    ✓                                    |                                                 ✓                                                  |
| AI Speaking Tutor                          |                                1/day                                |                                 10/day                                  |                                             Unlimited                                              |
| AI Listening Transcript                    |                                1/day                                |                                 10/day                                  |                                             Unlimited                                              |
| AI Exercise generation                     |                                3/day                                |                                Unlimited                                |                                             Unlimited                                              |
| AI Vocabulary actions                      |                                5/day                                |                                Unlimited                                |                                             Unlimited                                              |
| AI Writing Support                         |                                1/day                                |                                Unlimited                                |                                             Unlimited                                              |
| Import & export material                   |                                  —                                  |                                    ✓                                    |                                                 ✓                                                  |
| Account backup import / export             |                                  ✓                                  |                                    ✓                                    |                                                 ✓                                                  |
| Listening module                           |                                  —                                  |                                    ✓                                    |                                                 ✓                                                  |
| Learning Coach / Ask Coach                 |                                  —                                  |                                    —                                    |                                          ✓ (100 msg/day)                                           |

Paid statuses: `active`, `trialing`, `past_due`. Admins get Premium capabilities without Stripe.

---

## Import & export

Two different flows — keep them separate:

|             | Material import / export                                                 | Account backup                                           |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| **Formats** | CSV, PDF, DOCX                                                           | Notoria JSON                                             |
| **Who**     | **Pro+** (CSV _export_ free for vocab)                                   | **All plans**                                            |
| **Purpose** | Bring files into Vocabulary / Writing / Theory, or export printable docs | Export / restore learning data for the signed-in account |

**Account backup rules** (important)

- Restores workspaces, vocabulary, theory, writing/exercises, listening, speaking, tags, folders
- Uses **add as new** (match workspace by language; skip duplicate words; skip listening without media URLs)
- Media is **linked by URL**, not embedded
- Never changes name, email, password, OAuth, subscription, or Stripe data

---

## Tech stack

| Layer                | Choice                                                           |
| -------------------- | ---------------------------------------------------------------- |
| **App**              | Next.js 16 (App Router), React 19, TypeScript                    |
| **UI**               | Tailwind CSS v4, CSS Modules, shadcn/ui (Base UI), Lucide        |
| **Data**             | PostgreSQL 16, Drizzle ORM, TanStack Query                       |
| **Auth**             | NextAuth v5 (credentials + Google), Resend (password reset)      |
| **Billing**          | Stripe Checkout + Customer Portal + webhooks                     |
| **i18n**             | next-intl (EN / FI / SV / VI)                                    |
| **Editor**           | TipTap                                                           |
| **Export / import**  | `@react-pdf/renderer`, `docx`, `unpdf`, `mammoth`                |
| **AI**               | OpenAI (+ Realtime for speaking tutor)                           |
| **Speech**           | AssemblyAI (listening); OpenAI Realtime transcription (speaking) |
| **Media / realtime** | Cloudinary; private Vercel Blob (Reading PDF/DOCX); Stream Video |
| **Tests / deploy**   | Vitest · Vercel · Docker Compose (local Postgres)                |

---

## Project structure

**Expand** `src/` layout

```text
messages/                     # next-intl UI strings: en, fi, sv, vi
public/                       # logo, export fonts, static images
drizzle/                      # SQL migrations / entitlement schema dumps
scripts/                      # db-push and tooling helpers

src/
├── app/
│   ├── (auth)/               # sign-in, sign-up, forgot / reset password
│   ├── (onboarding)/         # first workspace / language setup
│   ├── (dashboard)/          # main app shell (sidebar)
│   │   ├── account/          # profile, billing, backup export/import
│   │   ├── coach/            # Premium Learning Coach
│   │   ├── vocabulary/       # word bank routes
│   │   ├── theory/           # grammar / usage notes
│   │   ├── writing/          # documents & worksheets
│   │   ├── exercises/        # study modes + import practice
│   │   ├── listening/        # lessons (Pro)
│   │   ├── speaking/         # sessions list / detail
│   │   ├── inbox/            # review-later / activity inbox
│   │   ├── getting-started/  # product guide
│   │   └── settings/         # appearance, shortcuts, prefs
│   ├── (call)/               # full-screen speaking call UI
│   ├── (legal)/              # privacy, terms, contact pages
│   ├── (public)/             # marketing / public surfaces
│   └── api/
│       ├── auth/             # NextAuth
│       ├── ai/               # writing, exercises, coach chat, …
│       ├── stream/           # Stream Video webhooks
│       └── stripe/           # checkout, portal, webhook, sync
│
├── components/               # feature UI (account, vocab, exercises, …)
├── db/                       # Drizzle schema + Postgres client
├── lib/                      # actions, billing, auth, domain logic
├── schemas/                  # Zod input schemas
└── types/                    # shared TypeScript types
```

---

## Getting started

### Requirements

- **Node.js 20+**
- **Docker Desktop** (local Postgres)
- **npm**
- Optional for full features: Cloudinary, OpenAI, AssemblyAI, Stream, Stripe (test), Resend

### Install & run

```bash
npm install
docker compose up -d          # Postgres on localhost:5434
# create .env.local (see Configuration)
npm run db:push
npm run dev                   # http://localhost:3000
```

| Script                        | Purpose                                   |
| ----------------------------- | ----------------------------------------- |
| `npm run dev`                 | Next.js development server                |
| `npm run build` / `npm start` | Production build & serve                  |
| `npm run lint`                | ESLint                                    |
| `npm test`                    | Vitest                                    |
| `npm run db:push`             | Push Drizzle schema (prod URL then local) |
| `npm run db:studio`           | Drizzle Studio                            |

Local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Configuration

Create `.env.local` in the project root.

**Full** `.env.local` **template**

```env
# ── Database (PostgreSQL) ──────────────────────────────────────────
# Local Docker URL (host port 5434 → container 5432). Required for app + db:push local.
DATABASE_URL=postgresql://notoria:notoria@localhost:5434/notoria
# Production / remote Neon (or other) URL. db:push applies schema here first, then local.
DATABASE_URL_PROD=

# ── Auth.js / NextAuth ─────────────────────────────────────────────
# Random secret for signing sessions/JWTs. Generate: openssl rand -base64 32
AUTH_SECRET=
# Canonical site origin (no trailing slash). Used for Auth.js, Stripe returns, reset links.
AUTH_URL=http://localhost:3000
# Optional public fallback if AUTH_URL is unset (see getAppBaseUrl).
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Google OAuth (Auth.js Google provider) ─────────────────────────
# From Google Cloud Console → OAuth client. Leave empty to hide Google sign-in.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Email / password reset (Resend) ────────────────────────────────
# API key from resend.com. Without both keys, forgot-password UI still “succeeds” but sends nothing.
RESEND_API_KEY=
# Verified sender, e.g. Notoria <onboarding@resend.dev> or Notoria <noreply@yourdomain.com>
RESEND_FROM_EMAIL=

# ── Media (Cloudinary) ─────────────────────────────────────────────
# Avatars + listening audio/video uploads. Required for avatar/listening upload flows.
# Not used for Reading PDF/DOCX (those use Vercel Blob below).
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Documents / backups (Vercel Blob, private) ─────────────────────
# Storage → notoria-blob → Quickstart → .env.local (also add to Vercel Production).
# Server-only — never expose as NEXT_PUBLIC_*.
BLOB_STORE_ID=
BLOB_READ_WRITE_TOKEN=
# BLOB_READ_WRITE_TOKEN is required for browser client uploads (handleUpload).
# Used for Reading PDF/DOCX and account-backup JSON (up to configured limits).

# ── AI (OpenAI) ────────────────────────────────────────────────────
# Vocabulary helpers, writing AI, exercise generation, listening practice, speaking tutor + summary.
OPENAI_API_KEY=

# ── Speech-to-text (AssemblyAI) ────────────────────────────────────
# Listening lesson transcription. Required for listening upload → transcript.
ASSEMBLYAI_API_KEY=

# ── Realtime video (Stream) ────────────────────────────────────────
# Public key is safe in the browser; secret stays server-only (tokens + webhooks).
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=
STREAM_VIDEO_SECRET_KEY=

# ── Billing (Stripe) ───────────────────────────────────────────────
# Secret key (sk_test_… / sk_live_…). Checkout is server-side — no publishable key needed.
STRIPE_SECRET_KEY=
# Signing secret from `stripe listen` (local) or Dashboard webhook endpoint (prod).
STRIPE_WEBHOOK_SECRET=
# Price IDs for Pro / Premium monthly products.
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
# Optional first-month intro coupons (leave empty if unused).
STRIPE_PRO_FIRST_MONTH_COUPON_ID=
STRIPE_PREMIUM_FIRST_MONTH_COUPON_ID=
```

**Notes**

- Postgres maps to host port **5434** (see `docker-compose.yml`) to avoid clashing with other local DBs.
- Without Resend keys, forgot-password still shows a generic success UI but sends no email.
- Checkout is server-side; a publishable Stripe key is not required by the app.
- `npm run db:push` targets `DATABASE_URL_PROD` then `DATABASE_URL`.

---

## Data & privacy

Notoria is built as a **personal learning workspace**:

- Learning content is private to the account (no social graph)
- Auth: credentials and/or Google OAuth; password-reset tokens are stored hashed
- Media (avatars, listening files) uses Cloudinary when configured; Reading PDF/DOCX originals use private Vercel Blob
- Billing identity lives with Stripe; entitlements sync via webhooks
- Account deletion removes learning data and cancels active Pro/Premium per product rules
- **Account backup** is learning-data portability — not an identity or subscription transfer

**Policy:** [Privacy](https://www.notoria.fi/privacy) · [Terms](https://www.notoria.fi/terms) · [contact@notoria.fi](mailto:contact@notoria.fi)

**Local DB helpers**

```bash
# Reset local volume
docker compose down -v && docker compose up -d && npm run db:push

# Too many Postgres clients
docker restart notoria-db
```

---

## Roadmap

Tracked in the product backlog of this repo:

- Listening dictation and word-ordering practice (types already exist in the schema)
- Statistics and charts

---

## Contributing

This repository powers the live Notoria product (`package.json` is marked `"private": true`).

If you have access and want to contribute:

1. Branch from the current default branch
2. Keep changes scoped; match existing patterns in `src/`
3. Run `npm run lint` and `npm test` before opening a PR
4. Prefer small PRs with a clear “why”

Questions: [contact@notoria.fi](mailto:contact@notoria.fi)

---

## License

No open-source license file is published in this repository. Treat the codebase as **proprietary** unless the maintainers state otherwise.

---

![Notoria logo](./public/logo.png)

**Notoria**  
Your material · Your progress · One private place

![www.notoria.fi](https://img.shields.io/badge/www.notoria.fi-f7a501?style=for-the-badge&labelColor=23251d)
