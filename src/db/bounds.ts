/**
 * Database wait bounds for the postgres.js driver.
 *
 * - connect_timeout: TCP/startup only (seconds).
 * - statement_timeout: PostgreSQL cancels the running statement (ms).
 * - idle_in_transaction_session_timeout: abandons stuck transactions (ms).
 *
 * These cancel work on the server. Do not wrap queries in Promise.race
 * alone — that leaves uncancelled work holding pool slots.
 */

/** Seconds to wait while establishing a connection. */
export const DB_CONNECT_TIMEOUT_SECONDS = 5;

/** Max idle time before a pooled connection is closed (seconds). */
export const DB_IDLE_TIMEOUT_SECONDS = 20;

/** PostgreSQL statement_timeout for every session (milliseconds). */
export const DB_STATEMENT_TIMEOUT_MS = 8_000;

/** Kill sessions left open in a transaction (milliseconds). */
export const DB_IDLE_IN_TX_TIMEOUT_MS = 10_000;
