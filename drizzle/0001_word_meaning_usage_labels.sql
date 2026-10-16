-- Meaning-level usage labels (stable identifiers, not display strings).
-- Empty array = unspecified usage for that sense.
ALTER TABLE "word_meanings"
ADD COLUMN IF NOT EXISTS "usage_labels" text[] DEFAULT '{}'::text[] NOT NULL;
