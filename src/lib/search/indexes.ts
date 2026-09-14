import { sql } from "drizzle-orm";
import { db } from "@/db";

const INDEX_STATEMENTS = [
  `create extension if not exists pg_trgm`,
  `create index if not exists vocabulary_words_fts_idx on vocabulary_words using gin (
    to_tsvector('simple', coalesce(word, '') || ' ' || coalesce(part_of_speech, '') || ' ' || coalesce(synonyms, '') || ' ' || coalesce(notes, ''))
  )`,
  `create index if not exists vocabulary_words_word_trgm_idx on vocabulary_words using gin (word gin_trgm_ops)`,
  `create index if not exists word_meanings_fts_idx on word_meanings using gin (to_tsvector('simple', meaning))`,
  `create index if not exists word_examples_fts_idx on word_examples using gin (
    to_tsvector('simple', coalesce(sentence, '') || ' ' || coalesce(meaning, '') || ' ' || coalesce(notes, ''))
  )`,
  `create index if not exists vocabulary_word_tags_fts_idx on vocabulary_word_tags using gin (to_tsvector('simple', tag))`,
  `create index if not exists grammar_notes_fts_idx on grammar_notes using gin (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(jsonb_to_tsvector('simple', content, '["string"]'::jsonb), 'C')
  )`,
  `create index if not exists grammar_notes_title_trgm_idx on grammar_notes using gin (title gin_trgm_ops)`,
  `create index if not exists exercises_fts_idx on exercises using gin (
    setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')), 'A') ||
    setweight(jsonb_to_tsvector('simple', content, '["string"]'::jsonb), 'C')
  )`,
  `create index if not exists exercises_title_trgm_idx on exercises using gin (title gin_trgm_ops)`,
  `create index if not exists listening_lessons_fts_idx on listening_lessons using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(topic, '') || ' ' || coalesce(transcript, ''))
  )`,
  `create index if not exists listening_lessons_title_trgm_idx on listening_lessons using gin (title gin_trgm_ops)`,
  `create index if not exists speaking_sessions_fts_idx on speaking_sessions using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(topic, '') || ' ' || coalesce(notes, '') || ' ' || coalesce(transcript, '') || ' ' || coalesce(summary, ''))
  )`,
  `create index if not exists speaking_sessions_title_trgm_idx on speaking_sessions using gin (title gin_trgm_ops)`,
  `create index if not exists workspace_folders_name_trgm_idx on workspace_folders using gin (name gin_trgm_ops)`,
  `create index if not exists exercise_imports_fts_idx on exercise_imports using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(extracted_text, ''))
  )`,
  `create index if not exists exercise_imports_title_trgm_idx on exercise_imports using gin (title gin_trgm_ops)`,
];

let indexesPromise: Promise<void> | null = null;

async function createSearchIndexes() {
  for (const statement of INDEX_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      console.error("[search] failed to ensure index", statement.split("\n")[0], error);
    }
  }
}

/** Idempotent. Safe to call on each search; CREATE INDEX IF NOT EXISTS is cheap after the first run. */
export function ensureSearchIndexes() {
  if (!indexesPromise) {
    indexesPromise = createSearchIndexes().catch((error) => {
      indexesPromise = null;
      console.error("[search] index bootstrap failed", error);
    });
  }
  return indexesPromise;
}
