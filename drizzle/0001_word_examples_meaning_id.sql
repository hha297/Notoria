-- Additive: link examples to a specific sense (nullable = word-level / unassigned).
-- No backfill — existing rows stay meaning_id NULL.
ALTER TABLE "word_examples"
  ADD COLUMN IF NOT EXISTS "meaning_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'word_examples_meaning_id_word_meanings_id_fk'
  ) THEN
    ALTER TABLE "word_examples"
      ADD CONSTRAINT "word_examples_meaning_id_word_meanings_id_fk"
      FOREIGN KEY ("meaning_id")
      REFERENCES "public"."word_meanings"("id")
      ON DELETE set null
      ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "word_examples_word_id_meaning_id_idx"
  ON "word_examples" ("word_id", "meaning_id");
