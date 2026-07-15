# Notoria

**Notoria** is a private web app for language learning. Collect vocabulary in language-specific workspaces, then practice with exercises generated entirely from your own words — no AI, no external dictionaries.

Each account owns its own data. The app is not a social platform: no public profiles, no sharing feed, no multiplayer features.

---

## What you can do today

### Authentication & account

- Register and sign in with email and password (NextAuth credentials, JWT sessions)
- Protected dashboard routes via middleware
- **Account settings** (`/account`): update display name, change password, upload or remove profile photo (Cloudinary)

### Workspaces

- One workspace per language you are learning
- Switch workspaces from the header; vocabulary and exercises always use the active workspace
- Default English workspace created on signup

### Vocabulary

- Add words with **multiple meanings** (drag-and-drop reorder)
- **Example sentences**, part of speech, notes, and tags (built-in groups + custom tags inline on the form)
- Filter and sort the vocabulary table (part of speech, tags, search)
- Learning status tracked per word (`NEW`, `LEARNING`, `REVIEW`, `MASTERED`)

### Exercise Studio

Six study modes under `/exercises`, all generated from workspace vocabulary:

| Mode | Description |
| ---- | ----------- |
| **Flashcards** | Flip cards with keyboard shortcuts and spaced-repetition ratings |
| **Writing** | Rich-text writing prompts saved in the editor (TipTap) |
| **Fill in the blank** | Complete example sentences with the missing word |
| **Multiple choice** | Word ↔ meaning quizzes; distractors from other words in the workspace |
| **Match pairs** | Quizlet-style word/meaning matching |
| **Type the answer** | Type the missing word or meaning with instant feedback |

Shared filters (part of speech, learning status, tags) and study-direction toggles where applicable. No third-party language APIs — only data you entered.

### Dashboard

- Word counts, words ready to practice, active workspace summary
- Quick links to vocabulary and Exercise Studio

### UI language

- App UI available in **English**, **Vietnamese**, and **Finnish** (header selector, `next-intl`)

---

## Tech stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Framework    | Next.js 16 (App Router)                                 |
| Language     | TypeScript                                              |
| Styling      | Tailwind CSS v4, shadcn/ui                              |
| Database     | PostgreSQL 16                                           |
| ORM          | Drizzle                                                 |
| Auth         | NextAuth v5 (credentials)                               |
| i18n         | next-intl                                               |
| Forms        | React Hook Form + Zod                                   |
| Editor       | TipTap (writing exercises)                              |
| Drag & drop  | dnd-kit                                                 |
| State        | TanStack Query (server data)                            |
| Media        | Cloudinary (profile avatars)                            |
| Icons        | Lucide                                                  |
| Deployment   | Docker, Docker Compose                                  |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/             # Sign in, sign up
│   ├── (dashboard)/        # Main app (sidebar layout)
│   │   ├── account/        # Profile, password, avatar
│   │   ├── exercises/      # Exercise Studio + study modes
│   │   └── vocabulary/     # Word list and editor
│   └── api/auth/           # NextAuth route handler
├── components/
│   ├── account/            # Account settings, user avatar
│   ├── auth/               # Login, register, password input
│   ├── editor/             # TipTap rich text editor
│   ├── exercises/          # Study sessions, type picker
│   ├── flashcards/         # Flashcard session UI
│   ├── layout/             # Sidebar, header, workspace selector
│   ├── vocabulary/         # Forms, table, tags
│   └── ui/                 # shadcn primitives
├── db/                     # Drizzle schema and client
├── lib/
│   ├── actions/            # Server Actions (CRUD, auth, account)
│   ├── exercises/          # Exercise generation from vocabulary
│   └── flashcards/         # Flashcard session logic
├── messages/               # en.json, vi.json, fi.json
└── schemas/                # Zod validation
```

---

## Requirements

- **Node.js** 20+
- **Docker Desktop** (for local PostgreSQL)
- **npm**
- **Cloudinary account** (optional — only needed for profile photo uploads)

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://notoria:notoria@localhost:5434/notoria

# Auth.js / NextAuth — generate AUTH_SECRET with: openssl rand -base64 32
AUTH_SECRET=your-secret-here
AUTH_URL=http://localhost:3000

# Cloudinary (optional — profile avatars)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

> PostgreSQL runs on port **5434** (not 5432) to avoid conflicts with other databases on your machine.

### 3. Start the database

```bash
docker compose up -d
```

This starts container `notoria-db` (image: `postgres:16-alpine`).

### 4. Apply database schema

```bash
npm run db:push
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account at `/sign-up`, then start adding vocabulary.

---

## Available scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start development server          |
| `npm run build`     | Production build                  |
| `npm run start`     | Run production server             |
| `npm run lint`      | Run ESLint                        |
| `npm run db:push`   | Push Drizzle schema to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio (DB browser)  |

---

## Routes

| Path | Description |
| ---- | ----------- |
| `/sign-in` | Sign in |
| `/sign-up` | Create account |
| `/` | Dashboard |
| `/vocabulary` | Word list |
| `/vocabulary/new` | Add a word |
| `/vocabulary/[id]` | Edit a word |
| `/exercises` | Exercise Studio (pick a study mode) |
| `/exercises/flashcard` | Flashcard session |
| `/exercises/writing` | New writing exercise |
| `/exercises/fill-in-blank` | Fill in the blank |
| `/exercises/multiple-choice` | Multiple choice |
| `/exercises/match-pairs` | Match pairs |
| `/exercises/type-answer` | Type the answer |
| `/exercises/[id]` | Edit a saved writing exercise |
| `/account` | Account settings |

---

## Database

### Main tables

- `users` — accounts (name, email, password hash, avatar URL)
- `workspaces` — one per user per language
- `workspace_tags` — workspace-scoped custom tag catalog
- `vocabulary_words` — words scoped to a workspace
- `word_meanings`, `word_examples`, `vocabulary_word_tags` — word relations
- `exercises` — saved writing documents (TipTap JSON)
- `flashcard_reviews`, `flashcard_progress` — spaced-repetition data

### Reset database

If credentials change or the DB gets into a bad state:

```bash
docker compose down -v
docker compose up -d
npm run db:push
```

### Connection pool errors

If you see `sorry, too many clients already` during development:

```bash
docker restart notoria-db
```

Then restart `npm run dev`.

---

## Planned / not yet implemented

- OAuth providers (Google, GitHub)
- Grammar notes module
- Writing journal (separate from exercise editor)
- Global search
- Statistics and charts
- Import/export (CSV, JSON, Markdown)
- Notebook (chapter-based structure)
