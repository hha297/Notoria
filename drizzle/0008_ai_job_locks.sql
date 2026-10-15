CREATE TABLE IF NOT EXISTS "ai_job_locks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "operation" text NOT NULL,
  "subject_id" text NOT NULL,
  "owner_id" text NOT NULL,
  "status" text NOT NULL,
  "locked_until" timestamp with time zone NOT NULL,
  "result" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ai_job_locks_status_check"
    CHECK ("status" in ('running', 'completed', 'failed', 'released'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_job_locks_operation_subject_unique"
  ON "ai_job_locks" ("operation", "subject_id");
