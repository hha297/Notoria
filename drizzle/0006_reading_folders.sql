-- Reading folders: folder_id on passages (SET NULL on folder delete)
ALTER TABLE reading_passages
  ADD COLUMN IF NOT EXISTS folder_id uuid
  REFERENCES workspace_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reading_passages_folder_id_idx
  ON reading_passages (folder_id);
