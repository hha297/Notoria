import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const localUrl = process.env.DATABASE_URL?.trim();
const prodUrl = process.env.DATABASE_URL_PROD?.trim();

if (!localUrl) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

if (!prodUrl) {
  throw new Error("DATABASE_URL_PROD is not set in .env.local");
}

function push(url, label) {
  console.log(`\n→ Pushing schema to ${label}...`);
  const result = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n✗ Schema push to ${label} failed`);
    process.exit(result.status ?? 1);
  }

  console.log(`✓ Schema pushed to ${label}`);
}

push(prodUrl, "production");
push(localUrl, "local");
console.log("\n✓ Done. DATABASE_URL is still local.");
