import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  DB_CONNECT_TIMEOUT_SECONDS,
  DB_IDLE_IN_TX_TIMEOUT_MS,
  DB_IDLE_TIMEOUT_SECONDS,
  DB_STATEMENT_TIMEOUT_MS,
} from "./bounds";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.client ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: DB_IDLE_TIMEOUT_SECONDS,
    connect_timeout: DB_CONNECT_TIMEOUT_SECONDS,
    connection: {
      // Server-side cancel; bounds each statement, not only connect.
      statement_timeout: DB_STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: DB_IDLE_IN_TX_TIMEOUT_MS,
      application_name: "notoria",
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

/** Raw postgres.js client (supports PendingQuery.cancel). Prefer `db` for app queries. */
export const sql = client;

export const db = drizzle(client, { schema });
