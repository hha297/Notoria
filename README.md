# Notoria

**Notoria** is a private web app for language learning. It helps you collect vocabulary, write exercises, and keep study materials in one place — built for long-term, personal use.

Each account owns its own data. The app is not a social platform: no public profiles, no sharing feed, no multiplayer features.

---

## What you can do today

### Vocabulary

- Add words with **multiple meanings**
- **Drag and drop** to reorder meanings
- Optional fields: pronunciation, part of speech, notes
- Browse all words in a table view
- Edit and save any entry

### Exercises

- Create exercise documents with a **rich text editor** (TipTap)
- Supported formatting: headings, bold/italic/underline, highlights, lists, task checklists, tables, images, links, code blocks
- Word and character counters
- **Autosave** after the first manual save
- Exercise types: questions, fill-in-the-blank, translation, writing, reading, grammar drill

### Dashboard

- Overview of word count, exercise count, and quick links to main modules

---

## Planned modules

These are defined in the product spec but not implemented yet:

- Authentication (register, login, Google/GitHub OAuth)
- Grammar notes
- Writing journal
- Collections & tags
- Global search
- Spaced repetition / review system
- Statistics & charts
- Import/export (CSV, Excel, JSON, Markdown)
- Notebook (chapter-based structure with flexible blocks)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | PostgreSQL 16 |
| ORM | Drizzle |
| Forms | React Hook Form + Zod |
| Editor | TipTap |
| Drag & drop | dnd-kit |
| State | TanStack Query (server data), Zustand (UI, reserved) |
| Icons | Lucide |
| Deployment | Docker, Docker Compose |

---

## Project structure

```
src/
├── app/                    # Next.js routes
│   └── (dashboard)/        # Main app shell (sidebar layout)
├── components/
│   ├── editor/             # TipTap rich text editor
│   ├── exercises/          # Exercise editor
│   ├── layout/             # Sidebar, page header, stat cards
│   ├── ui/                 # shadcn primitives + Logo
│   └── vocabulary/         # Vocabulary form, sortable meanings
├── db/
│   ├── schema.ts           # Drizzle schema
│   └── index.ts            # DB client (singleton pool)
├── lib/
│   ├── actions/            # Server Actions (CRUD)
│   └── auth/               # Demo user helper (until Auth.js)
└── schemas/                # Zod validation schemas
```

---

## Requirements

- **Node.js** 20+
- **Docker Desktop** (for local PostgreSQL)
- **npm**

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Default values:

```env
DATABASE_URL=postgresql://notoria:notoria@localhost:5434/notoria
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
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

Open [http://localhost:3000](http://localhost:3000).

On first request, a demo user is created automatically (no separate seed step).

---

## Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Drizzle schema to PostgreSQL |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard |
| `/vocabulary` | Word list |
| `/vocabulary/new` | Add a new word |
| `/vocabulary/[id]` | Edit a word |
| `/exercises` | Exercise list |
| `/exercises/new` | Create exercise |
| `/exercises/[id]` | Edit exercise (autosave) |

---

## Database

### Tables

- `users` — user accounts (demo user for now)
- `vocabulary_words` — vocabulary entries
- `word_meanings` — meanings per word (sortable)
- `word_examples` — rich examples (schema ready)
- `exercises` — exercise documents (JSON content from TipTap)
- `grammar_notes` — grammar pages (schema ready)

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

Then restart `npm run dev`. The app uses a singleton connection pool to reduce this in dev mode.

---

## Authentication (current state)

Auth is **not** implemented yet. The app uses a fixed demo user ID from `.env.local`. All vocabulary and exercises are stored under that user.

When Auth.js is added, the demo user helper in `src/lib/auth/demo-user.ts` will be replaced by real session handling.

---

## Design

UI tokens and component rules live in `.prompt/DESIGN.MD` (violet midnight canvas, lime accents, Rubik + Space Grotesk typography).

---

## License

Private project.
