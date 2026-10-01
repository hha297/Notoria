-- Reading feature tables and enums
DO $$ BEGIN
  CREATE TYPE reading_source_type AS ENUM ('paste', 'pdf', 'docx');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reading_exercise_mode AS ENUM (
    'multiple_choice',
    'written',
    'true_false_not_stated',
    'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reading_question_type AS ENUM (
    'multiple_choice',
    'written',
    'true_false_not_stated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reading_set_status AS ENUM ('generating', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reading_attempt_status AS ENUM (
    'in_progress',
    'submitted',
    'grading',
    'graded',
    'grading_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE folder_section ADD VALUE IF NOT EXISTS 'reading';
ALTER TYPE learning_entity_type ADD VALUE IF NOT EXISTS 'reading';

CREATE TABLE IF NOT EXISTS reading_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  language text NOT NULL,
  source_type reading_source_type NOT NULL DEFAULT 'paste',
  source_filename text,
  word_count integer NOT NULL DEFAULT 0,
  content_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reading_passages_user_workspace_updated_idx
  ON reading_passages (user_id, workspace_id, updated_at);

CREATE TABLE IF NOT EXISTS reading_question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id uuid NOT NULL REFERENCES reading_passages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  passage_content_version integer NOT NULL,
  exercise_mode reading_exercise_mode NOT NULL,
  question_count integer NOT NULL,
  question_language text NOT NULL,
  difficulty text,
  status reading_set_status NOT NULL DEFAULT 'generating',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reading_question_sets_passage_id_idx
  ON reading_question_sets (passage_id);

CREATE TABLE IF NOT EXISTS reading_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES reading_question_sets(id) ON DELETE CASCADE,
  type reading_question_type NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  correct_answer jsonb,
  key_points jsonb,
  explanation text,
  excerpt text,
  excerpt_start integer,
  excerpt_end integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reading_questions_set_id_idx
  ON reading_questions (set_id);

CREATE TABLE IF NOT EXISTS reading_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES reading_question_sets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status reading_attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  objective_correct integer,
  objective_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reading_attempts_set_id_idx ON reading_attempts (set_id);

CREATE TABLE IF NOT EXISTS reading_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES reading_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES reading_questions(id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  is_correct boolean,
  feedback jsonb,
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reading_answers_attempt_question_unique
  ON reading_answers (attempt_id, question_id);
