import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sqlText = readFileSync(
  resolve("drizzle/0008_ai_job_locks.sql"),
  "utf8",
);

const targets = [
  { label: "local", url: process.env.DATABASE_URL?.trim() },
  { label: "production", url: process.env.DATABASE_URL_PROD?.trim() },
];

for (const target of targets) {
  if (!target.url) {
    throw new Error(`Missing database URL for ${target.label}`);
  }
  console.log(`\n→ Applying ai_job_locks on ${target.label}...`);
  const sql = postgres(target.url, { prepare: false, max: 1 });
  try {
    await sql.unsafe(sqlText);
    const rows = await sql`
      select to_regclass('public.ai_job_locks') as exists
    `;
    console.log(`✓ ${target.label}: ai_job_locks =`, rows[0]?.exists);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

console.log("\n✓ Done.");
