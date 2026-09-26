<p align="center">
  <img src="./public/logo.png" alt="Notoria" width="120"/>
</p>

<h1 align="center">Notoria</h1>

<p align="center">
  <strong>Private language learning workspaces</strong><br/>
  Vocabulary, theory, writing, exercises, listening, and speaking — owned by you, scoped by language.
</p>

<p align="center">
  <a href="https://www.notoria.fi"><img src="https://img.shields.io/badge/Live-www.notoria.fi-f7a501?style=flat-square&labelColor=23251d" alt="Live — www.notoria.fi"/></a>
  &nbsp;
  <a href="https://www.notoria.fi"><img src="https://hits.sh/www.notoria.fi.svg?style=flat-square&label=views&color=f7a501" alt="Live site views"/></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.notoria.fi/sign-up"><img src="https://img.shields.io/badge/Sign_up-free_account-2c8c66?style=flat-square&labelColor=23251d" alt="Sign up"/></a>
  &nbsp;
  <a href="https://www.notoria.fi/sign-up"><img src="https://hits.sh/www.notoria.fi/sign-up.svg?style=flat-square&label=views&color=2c8c66" alt="Sign-up views"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  &nbsp;
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React"/>
  &nbsp;
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  &nbsp;
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square&labelColor=23251d" alt="Drizzle"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat-square&logo=stripe&logoColor=white" alt="Stripe"/>
  &nbsp;
  <img src="https://img.shields.io/badge/OpenAI-AI-412991?style=flat-square&logo=openai&logoColor=white" alt="OpenAI"/>
</p>

<p align="center">
  <a href="https://www.notoria.fi"><img src="https://img.shields.io/badge/Website-notoria.fi-23251d?style=flat-square" alt="Website"/></a>
  &nbsp;
  <a href="https://www.notoria.fi/privacy"><img src="https://img.shields.io/badge/Privacy-policy-5e6a72?style=flat-square" alt="Privacy"/></a>
  &nbsp;
  <a href="https://www.notoria.fi/terms"><img src="https://img.shields.io/badge/Terms-of_use-5e6a72?style=flat-square" alt="Terms"/></a>
  &nbsp;
  <a href="mailto:contact@notoria.fi"><img src="https://img.shields.io/badge/Contact-contact%40notoria.fi-2c84e0?style=flat-square" alt="Contact"/></a>
</p>

---

## Table of contents

- [What is Notoria?](#what-is-notoria)
- [Key features](#key-features)
- [How Notoria works](#how-notoria-works)
- [Plans at a glance](#plans-at-a-glance)
- [Import & export](#import--export)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Data & privacy](#data--privacy)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What is Notoria?

Notoria is a **private** language-learning product — not a social network. There are no public profiles, sharing feeds, or multiplayer classrooms.

| You get | What that means |
| --- | --- |
| **Owned learning data** | Words, notes, drafts, lessons, and sessions belong to your account |
| **One workspace per language** | English, Finnish, Swedish, Vietnamese, … stay separated |
| **Practice from your material** | Exercises drill *your* vocabulary and examples — not a generic dictionary |
| **Optional AI** | Free has a small daily allowance; Pro unlocks the toolkit; Premium adds a Learning Coach |

**Who it’s for:** learners who want a structured personal study space (lexicon → theory → drills → production → listening/speaking) with optional AI help and clear data ownership.

---

## Key features

| Module | Highlights |
| --- | --- |
| **Vocabulary** | Meanings, examples, tags, POS, learning status (`NEW` → `MASTERED`). SRS via flashcards. CSV export free; PDF/DOCX + file import on Pro. |
| **Exercises** | Flashcards, fill-blank, multiple choice, match pairs, type-answer from your words. Pro: AI contextual drills + **Form a Sentence**. |
| **Theory** | TipTap notebook for grammar, usage, culture, …. Category filters. PDF/DOCX import & export on Pro. |
| **Writing** | Rich documents and question-set worksheets. Pro AI: Check / Improve / Grammar. PDF/DOCX export on Pro. |
| **Listening** *(Pro)* | Upload audio/video → AssemblyAI transcript → OpenAI practice. Sticky player linked to transcript. |
| **Speaking** | Live AI video tutor (Stream + OpenAI Realtime). Transcript + feedback. Tutor calls metered on Free. |

### AI & personalization

| Layer | What’s included |
| --- | --- |
| **Free AI** | Small daily quotas (speaking tutor, listening transcript, exercise gen, vocab helpers, writing support) |
| **Pro AI** | Higher / unlimited lightweight AI; listening practice generation; AI practice from imported worksheets |
| **Premium** | Learning Coach on `/coach` — next-move recommendations, Ask Coach chat, progress views, attention cues from real activity |

Quotas use the **UTC calendar day** (reset 00:00 UTC). Stripe is the source of truth for paid status; the server reserves usage before AI calls and refunds on provider failure.

### Account & access

- Email/password + **Google OAuth** (Auth.js)
- Forgot / reset password via Resend
- Account settings: profile, password, avatar, billing, **account backup**
- UI locales: **English, Finnish, Swedish, Vietnamese**

---

## How Notoria works

```text
Onboard language workspace
        ↓
Build vocabulary & theory notes
        ↓
Practice (flashcards / quizzes / form-a-sentence)
        ↓
Produce (writing) · Listen · Speak
        ↓
Optional: Premium coach from real activity
```

Everything scopes to the **active workspace** (cookie). Modules share that language context so drills stay aligned with what you saved.

## Plans at a glance

Daily limits and prices live in `src/lib/billing/plans.ts` (`PLAN_DAILY_QUOTAS`). Subscribe from `/account`.

| Capability                                 | Free  | Pro (€9.99/mo) | Premium (€19.99/mo) |
| ------------------------------------------ | ----- | -------------- | ------------------- |
| Core vocab / writing / theory / CSV export | Yes   | Yes            | Yes                 |
| AI Speaking Tutor                          | 1/day | 10/day         | Unlimited           |
| AI Listening Transcript                    | 1/day | 10/day         | Unlimited           |
| AI Exercise generation                     | 3/day | Unlimited      | Unlimited           |
| AI Vocabulary actions                      | 5/day | Unlimited      | Unlimited           |
| AI Writing Support                         | 1/day | Unlimited      | Unlimited           |
| Import & export material                   | —     | Yes            | Yes                 |
| Import & export account backup             | Yes   | Yes            | Yes                 |
| Listening module                           | —     | Yes            | Yes                 |
| Learning Coach / Ask Coach                 | —     | —              | Yes (100 msg/day)   |

Paid statuses: `active`, `trialing`, `past_due`. Admins get Premium capabilities without Stripe.

---

## Import & export

Two different flows — keep them separate:

| Flow                         | Formats        | Availability                           | What it does                                                             |
| ---------------------------- | -------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| **Material import / export** | CSV, PDF, DOCX | **Pro+** (CSV _export_ free for vocab) | Bring files into Vocabulary / Writing / Theory, or export printable docs |
| **Account backup**           | Notoria JSON   | **All plans**                          | Export / restore learning data for the signed-in account                 |

**Account backup rules (important):**

- Restores workspaces, vocabulary, theory, writing/exercises, listening, speaking, tags, folders
- Uses **add as new** (match workspace by language; skip duplicate words; skip listening without media URLs)
- Media is **linked by URL**, not embedded
- Never changes name, email, password, OAuth, subscription, or Stripe data

---

## Tech stack

| Layer            | Choice                                                        |
| ---------------- | ------------------------------------------------------------- |
| App              | **Next.js 16** (App Router), **React 19**, TypeScript         |
| UI               | Tailwind CSS v4, CSS Modules, shadcn/ui (Base UI), Lucide     |
| Data             | PostgreSQL 16, **Drizzle ORM**, TanStack Query                |
| Auth             | NextAuth v5 (credentials + Google), Resend (password reset)   |
| Billing          | Stripe Checkout + Customer Portal + webhooks                  |
| i18n             | next-intl (EN / FI / SV / VI)                                 |
| Editor           | TipTap                                                        |
| Export / import  | `@react-pdf/renderer`, `docx`, `unpdf`, `mammoth`             |
| AI               | OpenAI (+ Realtime for speaking tutor)                        |
| Speech           | AssemblyAI (listening); Stream Video transcription (speaking) |
| Media / realtime | Cloudinary; Stream Video                                      |
| Tests            | Vitest                                                        |
| Deploy           | Vercel + Docker Compose (local Postgres)                      |

---

## Project structure

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
├── components/
│   ├── account/              # settings, avatar, backup import dialog
│   ├── auth/                 # auth forms & shells
│   ├── billing/              # upgrade modal, plan table, locks
│   ├── coach/                # Premium coach UI
│   ├── content-import/       # shared CSV/PDF/DOCX import dialog
│   ├── vocabulary/           # bank, form, preview, export
│   ├── theory/               # library, editor, rows
│   ├── writing/              # list, editor, AI panel, export
│   ├── exercises/            # studio, modes, import practice
│   ├── flashcards/           # SRS card UI
│   ├── listening/            # lessons, player, practice
│   ├── speaking/             # sessions + call lobby/active/ended
│   ├── folders/              # workspace folders
│   ├── workspace/            # create / switch / edit workspace
│   ├── dashboard/            # home, guide, continue cards
│   ├── layout/               # sidebar, header, page shell, locale
│   ├── editor/               # TipTap editor chrome
│   ├── export/               # shared export dialogs / format UI
│   ├── search/ · filters/    # global search & multi-filters
│   ├── onboarding/           # tutorials, language onboarding
│   ├── settings/ · preferences/
│   ├── legal/ · getting-started/ · help/
│   ├── providers/            # session, prefs, AI prefs
│   ├── style/                # CSS Modules per feature
│   ├── ui/                   # shadcn/Base UI primitives
│   └── shared/ · form/ · prompts/ · inbox/ · review-later/
│
├── db/                       # Drizzle schema + Postgres client
├── lib/
│   ├── actions/              # Server Actions (CRUD per domain)
│   ├── account-backup/       # parse / preview / import JSON backups
│   ├── content-import/       # extract → map → analyze pipeline
│   ├── billing/              # plans, quotas, entitlements, coach
│   ├── auth/ · email/        # sessions, Pro gates, password reset
│   ├── stripe/               # checkout / portal / subscription sync
│   ├── vocabulary/ · writing/ · theory/ · theory-exercises/
│   ├── exercises/ · exercise-import/ · flashcards/
│   ├── listening/ · speaking/
│   ├── editor/ · export/ · search/ · folders/ · ai/
│   └── query/ · activity/ · onboarding/ · taxonomy/ · …
├── schemas/                  # Zod input schemas
└── types/                    # shared TypeScript types
```

---

## Getting started

### Requirements

- **Node.js 20+**
- **Docker Desktop** (local Postgres)
- **npm**
- Optional providers for full features: Cloudinary, OpenAI, AssemblyAI, Stream, Stripe (test), Resend

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

Create `.env.local` in the project root:

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
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

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
- Media (avatars, listening files) uses Cloudinary when configured
- Billing identity lives with Stripe; entitlements sync via webhooks
- Account deletion removes learning data and cancels active Pro/Premium per product rules
- **Account backup** is learning-data portability — not an identity or subscription transfer

Official policy pages: [Privacy](https://www.notoria.fi/privacy) · [Terms](https://www.notoria.fi/terms) · [contact@notoria.fi](mailto:contact@notoria.fi)

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

<div align="center">
  <img src="./public/logo.png" alt="Notoria logo" width="88"/>

  <p><strong>Notoria</strong></p>

  <p>
    <sub>Built for learners who want their material — and their progress — in one private place.</sub>
  </p>

  <p>
    <a href="https://www.notoria.fi">www.notoria.fi</a>
  </p>
</div>
