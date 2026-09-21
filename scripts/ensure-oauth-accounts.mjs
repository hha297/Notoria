import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

await sql`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified timestamptz
`;

await sql`
  CREATE TABLE IF NOT EXISTS accounts (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    PRIMARY KEY (provider, provider_account_id)
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS accounts_user_id_idx
  ON accounts (user_id)
`;

console.log("oauth accounts + email_verified ready");
await sql.end();
