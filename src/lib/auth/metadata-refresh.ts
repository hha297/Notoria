import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@/db/schema";
import { AuthorizationUnavailableError } from "@/lib/auth/errors";
import { logAuthEvent } from "@/lib/auth/diagnostics";
import {
  ROLE_REFRESH_MS,
  authClock,
  classifyDependencyError,
  dependencyCauseCode,
  nextAuthBackoffMs,
} from "@/lib/auth/policy";

export type AuthMetadataRow = {
  id: string;
  role: UserRole;
  suspendedAt: Date | null;
};

type RefreshInput = {
  token: JWT;
  establishing: boolean;
  trigger?: string;
  loadUser: (userId: string) => Promise<AuthMetadataRow | null>;
  now?: number;
};

function categoryOf(error: unknown): string {
  if (error instanceof AuthorizationUnavailableError) return error.category;
  return classifyDependencyError(error);
}

function causeOf(error: unknown): string | undefined {
  if (error instanceof AuthorizationUnavailableError) return error.causeCode;
  return dependencyCauseCode(error);
}

/**
 * Refresh role and suspension on an existing JWT.
 * Returns null only when the user row is confirmed missing.
 * Throws only while establishing a new session if the read fails.
 * An existing session keeps its claims and records a backoff instead.
 *
 * Not used from middleware — navigation validates the signed token only.
 */
export async function refreshAuthMetadata({
  token,
  establishing,
  trigger,
  loadUser,
  now = authClock.now(),
}: RefreshInput): Promise<JWT | null> {
  if (!token.id) return token;

  const checkedAt = Number(token.adminCheckedAt ?? 0);
  const retryAt = Number(token.authzRetryAt ?? 0);
  const inBackoff = !establishing && trigger !== "update" && retryAt > now;
  const due =
    establishing ||
    trigger === "update" ||
    !token.role ||
    now - checkedAt > ROLE_REFRESH_MS;

  if (!due || inBackoff) return token;

  const phase = establishing ? "initial" : "refresh";
  const started = Date.now();

  try {
    const row = await loadUser(token.id);
    if (!row) {
      logAuthEvent({
        stage: "metadata-refresh",
        phase,
        outcome: "user-missing",
        operation: "auth.metadataRefresh",
        durationMs: Date.now() - started,
      });
      return null;
    }

    token.role = row.role;
    token.suspendedAt = row.suspendedAt?.toISOString() ?? null;
    token.adminCheckedAt = now;
    token.authzStale = false;
    delete token.authzRetryAt;
    delete token.authzBackoffMs;
    return token;
  } catch (error) {
    const errorCategory = categoryOf(error);
    const causeCode = causeOf(error);
    const durationMs = Date.now() - started;
    if (establishing) {
      logAuthEvent({
        stage: "metadata-refresh",
        phase,
        outcome: "unavailable",
        operation: "auth.metadataRefresh",
        durationMs,
        errorCategory,
        causeCode,
      });
      throw error instanceof AuthorizationUnavailableError
        ? error
        : new AuthorizationUnavailableError(errorCategory, causeCode);
    }

    const backoff = nextAuthBackoffMs(
      typeof token.authzBackoffMs === "number" ? token.authzBackoffMs : undefined,
    );
    token.authzStale = true;
    token.authzBackoffMs = backoff;
    token.authzRetryAt = now + backoff;
    logAuthEvent({
      stage: "metadata-refresh",
      phase,
      outcome: "preserved",
      operation: "auth.metadataRefresh",
      durationMs,
      errorCategory,
      causeCode,
    });
    return token;
  }
}
