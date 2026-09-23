# Notoria

**Notoria** is a private web app for language learning. Each account owns its own data: vocabulary, writing, theory notes, exercises, listening lessons, and speaking sessions live in **language-specific workspaces**. The app is not social — no public profiles, no sharing feed, no multiplayer.

Free includes core learning plus a small daily AI allowance. **Pro** (€9.99 / month) removes those limits and keeps the current Pro tools. **Premium** (€19.99 / month) adds a coach that reads activity already stored in the workspace.

---

# Plans

Daily AI limits use the UTC calendar day. They reset at 00:00 UTC. The browser clock is not used.

## Free

€0

Core language-learning functionality plus limited daily AI:

- 1 AI Meeting/day
- 1 Listening Transcript/day
- 3 AI Exercise generations/day
- 5 AI Vocabulary AI actions/day
- 1 AI Writing action/day (Check / Improve / Grammar each count as one)

PDF/DOCX export and generated listening practice stay on Pro. A meeting includes the tutor for that session. One user action counts as one use, including an exercise import (extract + generate share one charge).

## Pro

€9.99/month

Everything in Free plus:

- Unlimited AI meetings, transcripts, exercise generation, vocabulary AI, and writing AI
- Full listening practice
- Speaking sessions with the AI tutor
- PDF/DOCX export
- Exercise import without a daily cap

## Premium

€19.99/month

Everything in Pro plus, on `/coach`:

- AI learning coach (optional short note from the activity snapshot when OpenAI is configured)
- Personal learning profile from the workspace language, vocabulary statuses, and the latest speaking level
- Adaptive practice for today from due cards, weak flashcard ratings, and recent module use
- Weekly review of counts from the last 7 days
- Practice from flashcard ratings marked again or hard

Not shipped as their own screens: a sequenced learning path, and priority support. Those entitlements exist in the plan catalog for later work. The coach already reads vocabulary, flashcards, listening, speaking, writing, and theory together. It does not invent metrics.

## How access is decided

Stripe is the source of truth for paid status. Webhooks store `subscription_plan` and `subscription_status` on the user. The entitlement layer maps that plan to capabilities and quotas. The server reserves usage before an AI call and refunds the reservation if the provider call fails. The client cannot set the plan, the price, or the usage count.

Paid access statuses: `active`, `trialing`, `past_due`. Other statuses, including `canceled`, `unpaid`, `incomplete`, and `incomplete_expired`, are Free. An active subscription whose price is not the Premium price stays Pro, so existing Pro customers are not dropped when Premium is added. Admins receive Premium capabilities without a Stripe subscription.

Checkout accepts `pro` or `premium` and looks up the price id on the server. A user who already has a paid subscription changes price on that subscription instead of starting a second one.

---

## Free vs Pro

Some Pro-only controls stay faded and open the upgrade dialog. Quota features stay usable until the server returns `AI_QUOTA_EXCEEDED`.

| Capability | Free | Pro | Premium |
| ---------- | ---- | --- | ------- |
| Vocabulary, writing editor, theory notes, CSV | Yes | Yes | Yes |
| AI meeting | 1/day | Unlimited | Unlimited |
| Listening transcript | 1/day | Unlimited | Unlimited |
| AI exercise generation, including import | 3/day | Unlimited | Unlimited |
| Vocabulary AI actions | 5/day | Unlimited | Unlimited |
| Listening practice generation | No | Yes | Yes |
| AI writing | No | Yes | Yes |
| PDF / DOCX | No | Yes | Yes |
| Learning coach | No | No | Yes |

Subscribe from `/account`. Prices come from `src/lib/billing/plans.ts`.

---

## Features

### Authentication & Account

- Register and sign in with email and password (NextAuth credentials, JWT sessions)
- **Google OAuth** sign-in (Auth.js Google provider + Drizzle adapter `accounts` table)
- **Forgot / reset password** via email link ([Resend](https://resend.com)); tokens stored hashed in `password_reset_tokens`
- Protected dashboard routes via middleware
- Learning-language onboarding when the user has no workspace yet
- **Account settings** (`/account`): display name, password, Cloudinary avatar
- **Billing card**: Free quotas, Pro, or Premium. Checkout and the Stripe Customer Portal live on `/account`. Premium opens `/coach`.
- **Upgrade dialog**: Free, Pro, and Premium. The server chooses the Stripe price.
- User roles: `USER` (default) and `ADMIN` (Premium capabilities without a Stripe subscription)

### Workspaces

- One workspace per language you are learning (duplicate languages are blocked)
- Create, rename, delete, and switch workspaces from the header
- Vocabulary, writing, theory, exercises, listening, and speaking always use the **active** workspace
- Active workspace is stored in a cookie and restored across sessions
- A default English workspace is created on signup

### Vocabulary

Personal word bank for the active workspace.

- Multiple **meanings** and **example sentences** (drag-and-drop reorder)
- Optional meaning/translation and notes per example
- Part of speech, word-level notes, tags (built-in CEFR/topic/usage + workspace custom tags)
- **Primary meaning** selection for practice
- **Learning status** (`NEW`, `LEARNING`, `REVIEW`, `MASTERED`) updated by flashcard ratings
- Search, filter (POS, tags), sort; list grouped by part of speech; pagination
- Preview (read-only) → Edit → Save returns to preview
- **Background AI (free):** spelling suggestions while typing, and meaning/gloss ideas when adding or editing a word. Always **word → meaning**. Failures stay silent so the form still works offline from the model.
- **Export:** CSV for everyone; PDF and Word (.docx) for Pro, with optional columns (POS, tags, last updated, notes)

**Impact:** learners keep a structured lexicon they actually own. AI speeds entry without replacing the user’s dictionary. CSV remains a free escape hatch; formatted documents are a Pro print/share feature.

### Writing

Worksheets and drafts, separate from vocabulary quizzes.

- **Rich document** — TipTap editor
- **Question set** — sections and questions (prompt, example answer, notes) with reorder
- List with search/sort; preview → edit; autosave after first save on `/writing/new`
- **AI bar (Pro):** Check, Improve, and Grammar. Suggestions can be applied or skipped in the editor or question set
- **Export (Pro):** PDF or Word (.docx), with options for example answers, notes, and blank writing space

**Impact:** writing practice stays in-app instead of bouncing to a word processor. Pro AI is user-triggered only (never silent rewrites).

### Theory

A notebook for **how the language works**, not writing practice.

- Categories: grammar, vocabulary, pronunciation, writing, communication, usage, culture
- Title, short summary, TipTap explanation; search and category filters; read-time estimate
- Preview → edit; **export PDF/DOCX is Pro**

**Impact:** grammar notes no longer live in random writing docs. Writing stays for production; Theory stays for rules and usage.

### Exercise

Five study modes under `/exercises`, plus **Form a Sentence** (Pro). Quiz items come from **workspace vocabulary**, not a third-party dictionary. Sessions sample from the filtered pool (flashcards 30, fill-in-the-blank 15, multiple choice 20, match pairs 10, type-the-answer 15, form-a-sentence 5–10).

| Mode | Description |
| ---- | ----------- |
| **Flashcards** | Flip cards, keyboard shortcuts; Again / Hard / Good / Easy update learning status (SRS). No exercise-difficulty selector. |
| **Fill in the Blank** | Free: blanks in **your example sentences**. Pro: **Generate with AI** invents 10 new sentences per batch from your selected words, with **Easy / Medium / Hard / Intensive** controlling sentence complexity (not which words are chosen). |
| **Multiple Choice** | Three study modes (see below). Filters: part of speech, learning status, tags. Difficulty applies only to **Contextual**. |
| **Match Pairs** | Quizlet-style boards. No exercise-difficulty selector. |
| **Type the Answer** | Three study modes: **Word → Meaning** / **Meaning → Word** (deterministic, free); **Contextual** (Pro AI fill-in-the-blank typing in the workspace language, Easy–Intensive). |
| **Form a Sentence (Pro)** | Write a full sentence with a saved word; AI checks grammar/usage. No exercise-difficulty selector in the current implementation. |

#### Multiple Choice

| Study mode | Access | How it works |
| ---------- | ------ | ------------ |
| **Word → Meaning** | Free | Deterministic: show the saved word, pick the meaning. No AI. |
| **Meaning → Word** | Free | Deterministic: show the meaning, pick the word. No AI. |
| **Contextual** | Pro | AI generates fill-in-the-blank questions from your filtered vocabulary in the **active workspace language**. Easy / Medium / Hard / Intensive change context, clues, and distractors — not which words are chosen. Target answers never invent vocabulary outside your selection. Used by Multiple Choice (pick an option) and Type the Answer (type the form). |

Filters (all modes): part of speech, learning status, tags. Difficulty is shown only for Contextual and is **not** used as a CEFR vocabulary filter.

#### Exercise difficulty (Pro AI)

Available in **Fill in the Blank**, **Multiple Choice (Contextual)**, and **Type the Answer (Contextual)**:

- Levels: **Easy**, **Medium**, **Hard**, **Intensive**
- Difficulty changes **how** your existing vocabulary is tested (context, clue strength, distractors) — it does **not** swap in higher-CEFR words or introduce new target vocabulary
- Flashcards, Match Pairs, and Form a Sentence do not use this control

Shared filters: part of speech, learning status, tags. Study direction (word → meaning / meaning → word / mixed or Contextual) where it applies.

**Impact:** free users can still drill. Pro AI tests whether the learner can *use* their own words in new contexts without inventing a new word list.

### Listening (Pro)

Upload real audio or video and practice against a transcript.

- MP3 / MP4, max 25 MB; stored on Cloudinary
- AssemblyAI transcription; optional multi-speaker labels
- OpenAI generates practice from the transcript: **fill in the blank** and **multiple choice** (dictation / word-ordering types exist in the schema for later)
- Sticky audio player with seek from transcript utterances
- Lesson list: search, CEFR / topic / formality / status filters, rename file, retry failed jobs
- Entire module is Pro from the sidebar through pages and server actions. Free users see a lock screen and a faded Listening nav item

**Impact:** listening is no longer “play a file in another tab”. One upload becomes transcript + graded practice in the target language.

### Speaking (Pro)

Live video conversation with an AI tutor, then written feedback.

- Create a session (topic, CEFR level, optional notes); join from a full-screen call UI outside the dashboard chrome (`/speaking/[id]/call`)
- Stream Video for the call; OpenAI Realtime (`gpt-realtime`) as **Notoria Tutor** — greets the learner, stays on topic, matches CEFR, corrects important mistakes briefly
- Auto transcription; after hang-up the app disconnects the tutor, pulls the transcript, and writes a short summary (overview, what went well, what to practice)
- Session list with status (`upcoming` → `active` → `processing` → `completed`); reopen a completed call for transcript + feedback
- Entire module is Pro. Free users see a lock screen and a faded Speaking nav item
- Locally, the tutor connects from the call page because Stream webhooks cannot reach localhost. In production, configure `/api/stream/webhook` (see below)

**Impact:** speaking practice stays in the same workspace as vocabulary and listening, instead of a separate chatbot or an in-person tutor. The recording is off; the artifact is the transcript and tutor notes.

### Dashboard

Home is a workspace hub, not a word dump.

- Stats: words saved, words ready to practice, theory notes, writing pieces
- **Practice now** — jump into exercises when words have a primary meaning
- **Continue** — reopen the latest theory, writing, listening, or speaking item
- **How to use Notoria** — six-step path in sidebar order (Vocabulary → Theory → Exercise → Writing → Listening → Speaking)
- Per-module cards with a short “how”, a CTA, and a replayable tutorial
- Time-of-day greetings and first-workspace onboarding still run on top

**Impact:** new users see the whole product and a next action, instead of three counts and a list of recent words.

### Internationalization

- UI in **English**, **Finnish**, **Swedish**, and **Vietnamese** (`next-intl`, cookie-persisted via `notoria-locale`)
- Message catalogs live in `messages/{en,fi,sv,vi}.json`
- Separate from workspace learning languages (Finnish, Vietnamese, Japanese, …)

### Responsive design

- Mobile, tablet, and desktop layouts
- Mobile sidebar drawer; touch-friendly controls; vocabulary cards on small screens

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, CSS Modules (`src/components/style/`), shadcn/ui (Base UI) |
| Database | PostgreSQL 16 (local Docker; production Neon) |
| ORM | Drizzle |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Email | Resend (password-reset emails) |
| Billing | Stripe Checkout + Customer Portal + webhooks |
| i18n | next-intl (EN / FI / SV / VI UI locales) |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Editor | TipTap |
| Drag & drop | dnd-kit |
| Export | `@react-pdf/renderer`, `docx` |
| AI | OpenAI (vocabulary, writing, exercises, listening generation, speaking summary) + OpenAI Realtime (speaking tutor) |
| Speech | AssemblyAI (listening transcription); Stream Video transcription (speaking) |
| Realtime video | Stream Video + `@stream-io/openai-realtime-api` (AI tutor on the call) |
| Media | Cloudinary (avatars + listening files) |
| Tests | Vitest (unit/integration: access rules, AI contracts, export, taxonomy, …) |
| Icons | Lucide; country flags via `country-flag-icons` |
| Motion | Motion (flashcards) |
| Deployment | Vercel (app) + Docker Compose (local Postgres) |

---

## Project Structure

```
messages/                 # UI locales: en.json, fi.json, sv.json, vi.json
public/
├── fonts/                # Export fonts (PDF)
└── background.png        # Auth hero
src/
├── app/
│   ├── (auth)/           # Sign in, sign up, forgot / reset password
│   ├── (call)/           # Full-screen speaking call (no sidebar)
│   ├── (dashboard)/      # Sidebar layout
│   │   ├── account/      # Profile, password, avatar, billing
│   │   ├── exercises/    # Vocabulary practice modes
│   │   ├── listening/    # Pro listening lessons
│   │   ├── speaking/     # Pro speaking sessions
│   │   ├── theory/       # Grammar / usage notes
│   │   ├── vocabulary/
│   │   └── writing/
│   └── api/
│       ├── auth/         # NextAuth
│       ├── ai/           # Writing + exercise AI (Pro-gated)
│       ├── stream/       # Stream Video webhooks
│       └── stripe/       # Checkout, portal, webhook
├── components/
│   ├── account/          # Settings + Pro subscription card
│   ├── auth/             # Sign-in / sign-up / forgot / reset forms
│   ├── billing/          # Upgrade modal (Free vs Pro table), locked buttons, Pro provider
│   ├── dashboard/        # How-to guide + continue / practice now
│   ├── editor/           # TipTap
│   ├── exercises/
│   ├── flashcards/
│   ├── getting-started/  # Long-form product guide
│   ├── layout/           # Sidebar (Listening + Speaking locked for free), header
│   ├── listening/
│   ├── onboarding/       # Workspace onboarding + section tutorials
│   ├── settings/         # Appearance, shortcuts, local prefs
│   ├── speaking/
│   ├── style/            # Feature CSS Modules (auth, vocabulary, exercises, …)
│   ├── theory/
│   ├── vocabulary/
│   ├── workspace/
│   └── writing/
├── db/                   # Drizzle schema and client
├── lib/
│   ├── actions/          # Server Actions
│   ├── auth/             # Session + paid/Pro/AI access + password-reset tokens
│   ├── email/            # Resend password-reset mail
│   ├── exercises/        # Quiz generation + AI fill-in-blank / form-sentence
│   ├── flashcards/       # SRS
│   ├── listening/        # Transcribe, speakers, generate practice
│   ├── speaking/         # Tutor instructions, Stream, transcript summary
│   ├── stripe/           # Checkout, portal, subscription sync
│   ├── theory/
│   ├── vocabulary/       # Export + background AI
│   └── writing/          # Content model, export, AI
├── schemas/
└── types/
```

---

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (local PostgreSQL)
- **npm**
- Optional for full local features: Cloudinary, OpenAI, AssemblyAI, Stream Video, Stripe (test mode), Resend (password reset)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://notoria:notoria@localhost:5434/notoria

# Used by `npm run db:push` (prod first, then local)
DATABASE_URL_PROD=

# Auth.js / NextAuth — openssl rand -base64 32
AUTH_SECRET=your-secret-here
# Canonical app URL (no trailing slash). Used for Auth.js, Stripe return URLs, and password-reset links.
AUTH_URL=http://localhost:3000
# Optional fallback if AUTH_URL is unset (see getAppBaseUrl)
# NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (Auth.js provider — never commit real secrets)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Password reset email (Resend) — required for /forgot-password to send mail
RESEND_API_KEY=
# Verified sender, e.g. Notoria <onboarding@resend.dev> (dev) or Notoria <noreply@yourdomain.com>
RESEND_FROM_EMAIL=

# Cloudinary (avatars + listening uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenAI (vocabulary / writing / exercise / listening AI / speaking tutor + summary)
OPENAI_API_KEY=

# AssemblyAI (listening transcription)
ASSEMBLYAI_API_KEY=

# Stream Video (speaking calls)
NEXT_PUBLIC_STREAM_VIDEO_API_KEY=
STREAM_VIDEO_SECRET_KEY=

# Stripe (local and production — names only, never commit values)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
```

Copy from `.env.example` if you prefer a blank template. `STRIPE_PUBLISHABLE_KEY` is unused (Checkout is server-side).

Without `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, forgot-password still works for UX (always shows a generic success message) but no email is sent.

PostgreSQL runs on port **5434** (not 5432) to avoid clashing with other local databases.

### 3. Start the database

```bash
docker compose up -d
```

Container: `notoria-db` (`postgres:16-alpine`).

### 4. Apply the schema

```bash
npm run db:push
```

Pushes the Drizzle schema to **production** (`DATABASE_URL_PROD`) then **local** (`DATABASE_URL`), and leaves `DATABASE_URL` pointing at local.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up at `/sign-up`, then add vocabulary.

For local Stripe webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`.

---

## Production (Vercel)

Keep `.env.local` on **test** keys. Production env lives in **Vercel → Settings → Environment Variables → Production**.

| Variable | Production |
| -------- | ---------- |
| `DATABASE_URL` | Neon (pooled, `sslmode=require`) |
| `AUTH_SECRET` | Strong secret; do not rotate unless you intend to sign everyone out |
| `AUTH_URL` | Canonical site URL, no trailing slash (Auth.js, Stripe return URLs, password-reset links) |
| `NEXT_PUBLIC_APP_URL` | Optional fallback base URL if `AUTH_URL` is unset |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Resend API key (password-reset email) |
| `RESEND_FROM_EMAIL` | Verified From address, e.g. `Notoria <noreply@yourdomain.com>` |
| `CLOUDINARY_*` | Same account as media |
| `OPENAI_API_KEY` | Live key |
| `ASSEMBLYAI_API_KEY` | Live key |
| `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` | Stream Video API key |
| `STREAM_VIDEO_SECRET_KEY` | Stream Video API secret |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PRO_PRICE_ID` | Pro price (`price_...`, €9.99/month) |
| `STRIPE_PREMIUM_PRICE_ID` | Premium price (`price_...`, €19.99/month) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the live webhook |

After changing env vars, **Redeploy**.

**Speaking (Stream Video)**

1. [Stream Dashboard](https://dashboard.getstream.io) → Video app → copy API key + secret into the Vercel env vars above
2. Webhooks → add `https://YOUR-DOMAIN/api/stream/webhook`
3. Events: `call.session_started`, `call.session_participant_left`, `call.session_ended`, `call.transcription_ready`
4. Redeploy so `NEXT_PUBLIC_STREAM_VIDEO_API_KEY` is in the client bundle

The AI tutor stays connected through the Next.js server for the length of the call (`maxDuration` 300s). Use a Vercel plan that allows that, or a long-running Node host.

**Stripe (Live mode)**

Paid entitlements are written only after Stripe confirms the subscription. Checkout and in-app plan changes do not set the plan themselves. The webhook, and a short confirm step that reads the subscription back from Stripe, update the database.

Switching Pro and Premium updates the existing subscription item and invoices the prorated difference immediately. A failed payment leaves the current price in place. Moving to Free schedules cancellation and keeps the current plan until the period ends.

1. Create **Notoria Pro** (€9.99/month) and **Notoria Premium** (€19.99/month). Put the price ids in `STRIPE_PRO_PRICE_ID` and `STRIPE_PREMIUM_PRICE_ID`.
2. Webhook endpoint: `https://YOUR-DOMAIN/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Customer portal: invoices, payment method, and cancellation. Plan changes stay in Notoria on the existing subscription.

The app does not enable Stripe Tax. Receipts and billing emails are Stripe Dashboard settings, not sent by Notoria.

Schema changes go through `npm run db:push` (production, then local).

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` / `npm run test` | Vitest — unit & contract tests (`vitest run`) |
| `npm run db:push` | Push schema to production, then local (`DATABASE_URL_PROD` then `DATABASE_URL`) |
| `npm run db:studio` | Drizzle Studio |

---

## Application Routes

| Path | Description |
| ---- | ----------- |
| `/sign-in` | Sign in |
| `/sign-up` | Create an account |
| `/forgot-password` | Request a password-reset email (Resend) |
| `/reset-password` | Set a new password from the email link (`?token=...`) |
| `/` | Dashboard |
| `/vocabulary` | Word list (POS groups, search, filters, export) |
| `/vocabulary/new` | Add a word |
| `/vocabulary/[id]` | Word preview |
| `/vocabulary/[id]/edit` | Edit a word |
| `/writing` | Writing list |
| `/writing/new` | Create writing |
| `/writing/[id]` | Writing preview |
| `/writing/[id]/edit` | Edit writing |
| `/theory` | Theory notes |
| `/theory/new` | New theory note |
| `/theory/[id]` | Theory preview |
| `/theory/[id]/edit` | Edit theory |
| `/exercises` | Pick a study mode |
| `/exercises/flashcard` | Flashcards |
| `/exercises/fill-in-blank` | Fill in the blank (+ Pro AI generate) |
| `/exercises/multiple-choice` | Multiple choice |
| `/exercises/match-pairs` | Match pairs |
| `/exercises/type-answer` | Type the answer |
| `/exercises/form-sentence` | Form a sentence with AI feedback (Pro) |
| `/listening` | Listening list (Pro) |
| `/listening/[id]` | Lesson + practice (Pro) |
| `/speaking` | Speaking sessions (Pro) |
| `/speaking/[id]` | Session detail / transcript (Pro) |
| `/speaking/[id]/call` | Full-screen AI video call (Pro) |
| `/getting-started` | Full product guide |
| `/settings` | Theme, reduce-motion, keyboard shortcuts |
| `/account` | Profile, password, avatar, billing |

API: `POST /api/ai/writing`, `POST /api/ai/exercise`, `POST /api/ai/form-sentence` (Pro), `POST /api/stream/webhook`, `POST /api/stripe/create-checkout-session`, `POST /api/stripe/create-portal-session`, `POST /api/stripe/webhook`.

---

## Database

### Schema overview

| Table | Purpose |
| ----- | ------- |
| `users` | Account, role, avatar, **subscription + Stripe ids** |
| `accounts` | OAuth accounts (Google / Auth.js adapter) |
| `password_reset_tokens` | Hashed one-time password-reset tokens + expiry |
| `workspaces` | One workspace per user per language |
| `workspace_tags` | Custom tag catalog |
| `workspace_folders` | Folders for vocabulary / writing / theory organization |
| `vocabulary_words` | Words (POS, notes, learning status) |
| `word_meanings` | Ordered meanings (primary flag) |
| `word_examples` | Ordered example sentences |
| `vocabulary_word_tags` | Word ↔ tag links |
| `exercises` | Saved writing documents (JSONB: rich doc or question set) |
| `grammar_notes` | Theory notes (JSONB TipTap) |
| `listening_lessons` | Uploaded media, transcript, metadata, job status |
| `listening_exercises` | Generated listening questions |
| `speaking_sessions` | AI video-call sessions, transcript, summary |
| `flashcard_reviews` | Per-review rating log |
| `flashcard_progress` | Spaced-repetition state |

Subscription columns on `users`: `subscription_plan` (`free` / `pro` / `premium`), `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_current_period_end`, `stripe_cancel_at_period_end`.

Daily AI counters live in `ai_usage` (unique on user, feature, and UTC date) and `ai_usage_reservations` (one refundable reservation per action). `stripe_webhook_events` records processed event ids. SQL for these tables is in `drizzle/0001_subscription_entitlements.sql`. `npm run db:push` applies the Drizzle schema, which is the source the app runs against.

### Reset the local database

```bash
docker compose down -v
docker compose up -d
npm run db:push
```

### Connection pool errors

If you see `sorry, too many clients already`:

```bash
docker restart notoria-db
```

Then restart `npm run dev`.

---

## Roadmap

- Listening dictation and word-ordering practice (schema already has the types)
- Statistics and charts
- Vocabulary import (CSV / JSON)
