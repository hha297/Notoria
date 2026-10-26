import { AuthorizationUnavailableError } from "@/lib/auth/errors";
import { logAuthEvent } from "@/lib/auth/diagnostics";
import {
  classifyDependencyError,
  dependencyCauseCode,
} from "@/lib/auth/policy";

/**
 * Run a database operation that is already bounded by postgres.js
 * connect_timeout + PostgreSQL statement_timeout. Logs sanitized timing
 * on failure. Does not use Promise.race (would leave work uncancelled).
 */
export async function runBoundedDbOp<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthorizationUnavailableError) {
      logAuthEvent({
        stage: "database",
        phase: "query",
        outcome: "unavailable",
        operation,
        durationMs: Date.now() - started,
        errorCategory: error.category,
        causeCode: error.causeCode,
      });
      throw error;
    }

    const errorCategory = classifyDependencyError(error);
    const causeCode = dependencyCauseCode(error);
    logAuthEvent({
      stage: "database",
      phase: "query",
      outcome: "unavailable",
      operation,
      durationMs: Date.now() - started,
      errorCategory,
      causeCode,
    });
    throw new AuthorizationUnavailableError(errorCategory, causeCode);
  }
}
