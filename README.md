# Notoria

**Notoria** is a private web app for language learning. Each account owns its own data: vocabulary, writing, theory notes, exercises, and listening lessons live in **language-specific workspaces**. The app is not social — no public profiles, no sharing feed, no multiplayer.

Free users can collect words and practice with quizzes built from those words. **Notoria Pro** unlocks the rest of the learning loop: AI writing help, AI fill-in-the-blank generation, PDF/DOCX export, and the full Listening module.

---

## Free vs Pro

Access is **Admin or an active Pro subscription** (`active`, `trialing`, or `past_due`). Locked controls stay clickable: they look faded (opacity + grayscale) and open the upgrade modal instead of failing silently.

| Capability | Free | Pro / Admin | Impact |
| ---------- | ---- | ----------- | ------ |
| Vocabulary CRUD, tags, search, filters | Yes | Yes | Core library stays usable without paying |
| Background spelling + meaning AI while adding/editing words | Yes | Yes | Faster, more accurate word entry without a paywall |
| Vocabulary **CSV** export | Yes | Yes | Spreadsheet backup for everyone |
| Vocabulary / writing / theory **PDF & DOCX** export | Locked | Yes | Printable worksheets and shareable files |
| Writing editor (rich document + question set) | Yes | Yes | Drafts and worksheets without AI |
| Writing AI: Check / Improve / Grammar | Locked | Yes | Corrections on the learner’s own text |
| Exercise modes from your examples | Yes | Yes | Practice still works from saved example sentences |
| Fill in the Blank **Generate with AI** (10 new sentences) | Locked | Yes | Practice the word in *new* contexts, not memorized examples |
| Theory notes | Yes | Yes | Grammar/usage notebook for every user |
| **Listening** (upload, transcript, practice) | Locked (whole module) | Yes | Turns real audio/video into a lesson |

Subscribe from `/account` or any locked control. Price in the UI: **€4.99 / month**, cancel anytime via Stripe Customer Portal.

---

## Features

### Authentication & Account

- Register and sign in with email and password (NextAuth credentials, JWT sessions)
- Protected dashboard routes via middleware
- **Account settings** (`/account`): display name, password, Cloudinary avatar
- **Billing card**: upgrade to Pro (Stripe Checkout), manage subscription (Customer Portal), plan/status badges
- User roles: `USER` (default) and `ADMIN` (full Pro access without a Stripe subscription)

### Workspaces

- One workspace per language you are learning (duplicate languages are blocked)
- Create, rename, delete, and switch workspaces from the header
- Vocabulary, writing, theory, exercises, and listening always use the **active** workspace
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

Five study modes under `/exercises`. Quiz items come from **workspace vocabulary**, not a third-party dictionary. Sessions sample from the filtered pool (flashcards 30, fill-in-the-blank 15, multiple choice 20, match pairs 10, type-the-answer 15).

| Mode | Description |
| ---- | ----------- |
| **Flashcards** | Flip cards, keyboard shortcuts; Again / Hard / Good / Easy update learning status (SRS) |
| **Fill in the Blank** | Free: blanks in **your example sentences**. Pro: **Generate with AI** invents 10 new sentences per batch (CEFR A1–C2), then 10 more after a round. Inflected answers allowed when grammar requires them |
| **Multiple Choice** | Word ↔ meaning; distractors from other workspace words |
| **Match Pairs** | Quizlet-style boards |
| **Type the Answer** | Type the word or meaning with instant feedback |

Shared filters: part of speech, learning status, tags. Study direction (word → meaning / meaning → word / mixed) where it applies.

**Impact:** free users can still drill. Pro FIB stops overfitting to memorized examples and tests whether the learner can *use* the word.

### Listening (Pro)

Upload real audio or video and practice against a transcript.

- MP3 / MP4, max 25 MB; stored on Cloudinary
- AssemblyAI transcription; optional multi-speaker labels
- OpenAI generates practice from the transcript: **fill in the blank** and **multiple choice** (dictation / word-ordering types exist in the schema for later)
- Sticky audio player with seek from transcript utterances
- Lesson list: search, CEFR / topic / formality / status filters, rename file, retry failed jobs
- Entire module is Pro from the sidebar through pages and server actions. Free users see a lock screen and a faded Listening nav item

**Impact:** listening is no longer “play a file in another tab”. One upload becomes transcript + graded practice in the target language.

### Dashboard

- Word counts, words ready to practice, active workspace
- Quick links and onboarding cues (first words, first writing, theory, exercises)
- Time-of-day greetings and study suggestions

### Internationalization

- UI in **English**, **Vietnamese**, and **Finnish** (`next-intl`, cookie-persisted)
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
| Styling | Tailwind CSS v4, shadcn/ui (Base UI) |
| Database | PostgreSQL 16 (local Docker; production Neon) |
| ORM | Drizzle |
| Auth | NextAuth v5 (credentials) |
| Billing | Stripe Checkout + Customer Portal + webhooks |
| i18n | next-intl |
| Forms | React Hook Form + Zod |
| Editor | TipTap |
| Drag & drop | dnd-kit |
| Export | `@react-pdf/renderer`, `docx` |
| AI | OpenAI (vocabulary, writing, exercises, listening generation) |
| Speech | AssemblyAI (listening transcription) |
| Media | Cloudinary (avatars + listening files) |
| Tests | Vitest (access rules, AI contracts) |
| Icons | Lucide |
| Motion | Motion (flashcards) |
| Deployment | Vercel (app) + Docker Compose (local Postgres) |

---

## Project Structure

```
messages/                 # UI locales: en.json, vi.json, fi.json
public/
├── fonts/                # Export fonts (PDF)
└── background.png        # Auth hero
src/
├── app/
│   ├── (auth)/           # Sign in, sign up
│   ├── (dashboard)/      # Sidebar layout
│   │   ├── account/      # Profile, password, avatar, billing
│   │   ├── exercises/    # Vocabulary practice modes
│   │   ├── listening/    # Pro listening lessons
│   │   ├── theory/       # Grammar / usage notes
│   │   ├── vocabulary/
│   │   └── writing/
│   └── api/
│       ├── auth/         # NextAuth
│       ├── ai/           # Writing + exercise AI (Pro-gated)
│       └── stripe/       # Checkout, portal, webhook
├── components/
│   ├── account/          # Settings + Pro subscription card
│   ├── billing/          # Upgrade modal, locked buttons/styles, Pro provider
│   ├── editor/           # TipTap
│   ├── exercises/
│   ├── flashcards/
│   ├── layout/           # Sidebar (Listening locked for free), header
│   ├── listening/
│   ├── theory/
│   ├── vocabulary/
│   ├── workspace/
│   └── writing/
├── db/                   # Drizzle schema and client
├── lib/
│   ├── actions/          # Server Actions
│   ├── auth/             # Session + paid/Pro/AI access
│   ├── exercises/        # Quiz generation + AI fill-in-blank
│   ├── flashcards/       # SRS
│   ├── listening/        # Transcribe, speakers, generate practice
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
- Optional for full local features: Cloudinary, OpenAI, AssemblyAI, Stripe (test mode)

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

# Auth.js / NextAuth — openssl rand -base64 32
AUTH_SECRET=your-secret-here
AUTH_URL=http://localhost:3000

# Cloudinary (avatars + listening uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenAI (vocabulary / writing / exercise / listening AI)
OPENAI_API_KEY=

# AssemblyAI (listening transcription)
ASSEMBLYAI_API_KEY=

# Stripe test keys (local billing)
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

`STRIPE_PUBLISHABLE_KEY` is unused (Checkout is server-side).

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
| `AUTH_URL` | Canonical site URL, no trailing slash (Stripe success/cancel/portal return here) |
| `CLOUDINARY_*` | Same account as media |
| `OPENAI_API_KEY` | Live key |
| `ASSEMBLYAI_API_KEY` | Live key |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_PRICE_ID` | Live Price ID (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the **live** webhook |

After changing env vars, **Redeploy**.

**Stripe (Live mode)**

1. Product + recurring price → `STRIPE_PRICE_ID`
2. Webhook endpoint: `https://YOUR-DOMAIN/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Customer portal: enable invoices, payment method update, and cancellation. Do **not** require “Activate link” — the app opens the portal via API from `/account`.

Schema changes: point Drizzle at the prod `DATABASE_URL`, run `npm run db:push`, then switch back to local. Additive billing columns (`subscription_plan`, Stripe ids, listening `original_filename`) are already on production.

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |
| `npm run db:studio` | Drizzle Studio |

---

## Application Routes

| Path | Description |
| ---- | ----------- |
| `/sign-in` | Sign in |
| `/sign-up` | Create an account |
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
| `/listening` | Listening list (Pro) |
| `/listening/[id]` | Lesson + practice (Pro) |
| `/account` | Profile, password, avatar, billing |

API: `POST /api/ai/writing`, `POST /api/ai/exercise` (Pro), `POST /api/stripe/create-checkout-session`, `POST /api/stripe/create-portal-session`, `POST /api/stripe/webhook`.

---

## Database

### Schema overview

| Table | Purpose |
| ----- | ------- |
| `users` | Account, role, avatar, **subscription + Stripe ids** |
| `workspaces` | One workspace per user per language |
| `workspace_tags` | Custom tag catalog |
| `vocabulary_words` | Words (POS, notes, learning status) |
| `word_meanings` | Ordered meanings (primary flag) |
| `word_examples` | Ordered example sentences |
| `vocabulary_word_tags` | Word ↔ tag links |
| `exercises` | Saved writing documents (JSONB: rich doc or question set) |
| `grammar_notes` | Theory notes (JSONB TipTap) |
| `listening_lessons` | Uploaded media, transcript, metadata, job status |
| `listening_exercises` | Generated listening questions |
| `flashcard_reviews` | Per-review rating log |
| `flashcard_progress` | Spaced-repetition state |

Subscription columns on `users`: `subscription_plan` (`free` / `pro`), `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_current_period_end`.

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

- OAuth providers (Google, GitHub)
- Listening dictation and word-ordering practice (schema already has the types)
- Global search
- Statistics and charts
- Vocabulary import (CSV / JSON)
