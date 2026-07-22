# Notoria

**Notoria** is a private web application for language learning. Collect vocabulary in language-specific workspaces, then practice with exercises generated entirely from your own words — no AI, no external dictionaries.

Each account owns its own data. The app is not a social platform: no public profiles, no sharing feed, and no multiplayer features.

---

## Features

### Authentication & Account

- Register and sign in with email and password (NextAuth credentials, JWT sessions)
- Protected dashboard routes via middleware
- **Account settings** (`/account`): update display name, change password, upload or remove profile photo (Cloudinary)

### Workspaces

- One workspace per language you are learning (duplicate languages are blocked)
- Create and switch workspaces from the header; vocabulary and exercises always use the **active** workspace
- Active workspace is stored in a cookie and restored across sessions
- A default English workspace is created on signup

### Vocabulary

- Add words with **multiple meanings** and **example sentences** (drag-and-drop reorder)
- Each example can include optional **meaning/translation** and **notes/explanation** (collapsible per sentence)
- Part of speech, word-level notes, and tags
- **Tags:** built-in groups (level A1–C2, topic, usage) plus workspace custom tags
- **Learning status** per word (`NEW`, `LEARNING`, `REVIEW`, `MASTERED`) — updated by flashcard ratings
- Search, filter (part of speech, tags), and sort (word / last updated)
- List grouped into **separate tables by part of speech** (Noun, Verb, …); uncategorized words in their own section
- Click a word → **read-only preview**; **Edit** opens the form; Save returns to preview
- Responsive list: cards on mobile, tables on desktop
- **Export** the currently filtered/sorted list to **PDF**, **CSV**, or **Word (.docx)** with optional columns (part of speech, tags, last updated, notes)

### Writing

- Dedicated **Writing** module (separate from Exercise)
- **Rich document** mode — TipTap rich text editor
- **Question set** mode — sections and questions (prompt, example answer, notes) with drag-and-drop reorder
- List view with search and sorting; create, delete, export from the list
- Click a document → **read-only preview**; **Edit** opens the editor; Save returns to preview (Cancel discards unsaved edits)
- Autosave on `/writing/new` after the first save; explicit Save when editing from preview
- **Export** to **PDF** or **Word (.docx)** with options for example answers, notes, and blank writing space

### Exercise

Five study modes under `/exercises`. Quiz modes are generated from workspace vocabulary (no third-party language APIs). Sessions typically sample **20–50** items from the filtered pool.

| Mode | Description |
| ---- | ----------- |
| **Flashcards** | Flip cards with keyboard shortcuts; spaced-repetition ratings (Again / Hard / Good / Easy) update learning status |
| **Fill in the Blank** | Complete your own example sentences with the missing word |
| **Multiple Choice** | Word ↔ meaning quizzes; distractors from other words in the workspace |
| **Match Pairs** | Quizlet-style word/meaning matching boards |
| **Type the Answer** | Type the word or meaning with instant feedback |

Shared filters on quiz sessions: part of speech, learning status, and tags. Study-direction toggles (word → meaning / meaning → word / mixed) where applicable.

### Dashboard

- Word counts, words ready to practice, and active workspace summary
- Quick links to vocabulary and Exercise
- Recent words list

### Internationalization

- App UI available in **English**, **Vietnamese**, and **Finnish**
- Language selector in the header (`next-intl`, cookie-persisted)
- Separate from workspace learning languages (Finnish, Vietnamese, Japanese, etc.)

### Responsive Design

- Layouts and navigation optimized for **mobile**, **tablet**, and **desktop**
- Mobile sidebar drawer closes after navigation
- Touch-friendly controls, adaptive padding, and mobile-friendly vocabulary cards

---

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Base UI) |
| Database | PostgreSQL 16 |
| ORM | Drizzle |
| Auth | NextAuth v5 (credentials) |
| i18n | next-intl |
| Forms | React Hook Form + Zod |
| Editor | TipTap (writing exercises) |
| Drag & drop | dnd-kit |
| Export | `@react-pdf/renderer`, `docx` |
| Media | Cloudinary (profile avatars) |
| Icons | Lucide |
| Motion | Motion (flashcards) |
| Deployment | Docker, Docker Compose |

---

## Project Structure

```
messages/                 # UI locales: en.json, vi.json, fi.json
public/
├── fonts/                # Export fonts (PDF)
└── background.png        # Auth hero (desktop/tablet)
src/
├── app/
│   ├── (auth)/           # Sign in, sign up
│   ├── (dashboard)/      # Sidebar layout
│   │   ├── account/      # Profile, password, avatar
│   │   ├── exercises/    # Exercise (vocabulary practice)
│   │   ├── vocabulary/   # Word list, preview, editor
│   │   └── writing/      # Writing list, preview, editor
   └── api/auth/         # NextAuth route handler
├── components/
│   ├── account/          # Account settings, avatar
│   ├── auth/             # Login, register, password input
│   ├── editor/           # TipTap rich text editor
│   ├── exercises/        # Sessions, filters
│   ├── flashcards/       # Flashcard session UI
│   ├── layout/           # Sidebar, header, document title
│   ├── providers/        # Session, query, tooltip wrappers
│   ├── ui/               # shadcn primitives
│   ├── vocabulary/       # Forms, preview, table, tags, export
│   ├── workspace/        # Create workspace dialog
│   └── writing/          # List, preview, editor, export
├── db/                   # Drizzle schema and client
├── hooks/                # Shared React hooks
├── i18n/                 # Locale config and request helpers
├── lib/
│   ├── actions/          # Server Actions (CRUD, auth, account)
│   ├── auth/             # Session helpers
│   ├── exercises/        # Quiz generation + session sizing
│   ├── flashcards/       # Flashcard filters and SRS session logic
│   ├── vocabulary/       # Vocabulary export (PDF / CSV / DOCX)
│   └── writing/          # Writing content model + export
├── schemas/              # Zod validation
└── types/                # Shared TypeScript types
```

---

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for local PostgreSQL)
- **npm**
- **Cloudinary account** (optional — only needed for profile photo uploads)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

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

### 3. Start the Database

```bash
docker compose up -d
```

This starts container `notoria-db` (image: `postgres:16-alpine`).

### 4. Apply the Database Schema

```bash
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account at `/sign-up`, then start adding vocabulary.

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push the Drizzle schema to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio (database browser) |

---

## Application Routes

| Path | Description |
| ---- | ----------- |
| `/sign-in` | Sign in |
| `/sign-up` | Create an account |
| `/` | Dashboard |
| `/vocabulary` | Vocabulary list (grouped by POS; search, filters, export) |
| `/vocabulary/new` | Add a word |
| `/vocabulary/[id]` | Word preview (read-only) |
| `/vocabulary/[id]/edit` | Edit a word |
| `/writing` | Writing list (search, sort, export) |
| `/writing/new` | Create writing |
| `/writing/[id]` | Writing preview (read-only) |
| `/writing/[id]/edit` | Edit writing |
| `/exercises` | Exercise (pick a study mode) |
| `/exercises/flashcard` | Flashcard session |
| `/exercises/fill-in-blank` | Fill in the blank |
| `/exercises/multiple-choice` | Multiple choice |
| `/exercises/match-pairs` | Match pairs |
| `/exercises/type-answer` | Type the answer |
| `/account` | Account settings |

---

## Database

### Schema Overview

| Table | Purpose |
| ----- | ------- |
| `users` | Accounts (name, email, password hash, avatar URL) |
| `workspaces` | One workspace per user per language |
| `workspace_tags` | Workspace-scoped custom tag catalog |
| `vocabulary_words` | Words in a workspace (POS, notes, learning status) |
| `word_meanings` | Ordered meanings |
| `word_examples` | Ordered example sentences (optional meaning + notes per example) |
| `vocabulary_word_tags` | Word ↔ tag links (built-in ids or `custom:…`) |
| `exercises` | Saved writing documents (JSONB: rich document or question set) |
| `flashcard_reviews` | Per-review rating log |
| `flashcard_progress` | Spaced-repetition state |

> `grammar_notes` exists in the schema for a future module and is not exposed in the UI yet.

### Reset the Database

If credentials change or the database gets into a bad state:

```bash
docker compose down -v
docker compose up -d
npm run db:push
```

### Connection Pool Errors

If you see `sorry, too many clients already` during development:

```bash
docker restart notoria-db
```

Then restart `npm run dev`.

---

## Roadmap

- OAuth providers (Google, GitHub)
- Grammar notes module (schema reserved)
- Global search
- Statistics and charts
- Vocabulary import (CSV / JSON)
- Notebook (chapter-based structure)
