-- Reading document metadata for private Vercel Blob originals (PDF/DOCX).
DO $$ BEGIN
  CREATE TYPE reading_upload_status AS ENUM ('uploading', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reading_passages
  ADD COLUMN IF NOT EXISTS storage_provider text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes integer,
  ADD COLUMN IF NOT EXISTS upload_status reading_upload_status NOT NULL DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS reading_passages_upload_status_idx
  ON reading_passages (upload_status);
