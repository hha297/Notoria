-- Study Inbox, Review Later bookmarks, and Recent Activity feed.
-- Apply with `npm run db:push` or run this SQL manually.

DO $$ BEGIN
  CREATE TYPE study_inbox_status AS ENUM ('unprocessed', 'processed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bookmark_purpose AS ENUM ('review_later');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE learning_entity_type AS ENUM (
    'vocabulary',
    'theory',
    'writing',
    'exercise',
    'listening',
    'speaking',
    'inbox'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_verb AS ENUM (
    'created',
    'updated',
    'completed',
    'processed',
    'review_later_added',
    'review_later_removed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS study_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  content text NOT NULL,
  note text,
  source text,
  status study_inbox_status NOT NULL DEFAULT 'unprocessed',
  processed_at timestamptz,
  linked_entity_type learning_entity_type,
  linked_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_inbox_items_workspace_status_created_idx
  ON study_inbox_items (workspace_id, user_id, status, created_at);

CREATE INDEX IF NOT EXISTS study_inbox_items_fts_idx
  ON study_inbox_items
  USING gin (
    to_tsvector(
      'simple',
      coalesce(content, '') || ' ' || coalesce(note, '') || ' ' || coalesce(source, '')
    )
  );

CREATE TABLE IF NOT EXISTS workspace_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type learning_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  purpose bookmark_purpose NOT NULL DEFAULT 'review_later',
  title_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_bookmarks_unique
  ON workspace_bookmarks (workspace_id, user_id, entity_type, entity_id, purpose);

CREATE INDEX IF NOT EXISTS workspace_bookmarks_list_idx
  ON workspace_bookmarks (workspace_id, user_id, purpose, created_at);

CREATE TABLE IF NOT EXISTS workspace_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  verb activity_verb NOT NULL,
  entity_type learning_entity_type NOT NULL,
  entity_id uuid,
  title_snapshot text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_activity_events_list_idx
  ON workspace_activity_events (workspace_id, user_id, created_at);
