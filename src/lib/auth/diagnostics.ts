import { currentAuthRequest } from "@/lib/auth/request-context";

export type AuthStage =
  | "sign-in"
  | "metadata-refresh"
  | "authorization"
  | "session"
  | "database";

export type AuthPhase = "initial" | "refresh" | "check" | "query";

export type AuthOutcome =
  | "preserved"
  | "user-missing"
  | "unavailable"
  | "denied"
  | "suspended"
  | "ok";

/**
 * Sanitized auth/DB log. Never pass tokens, cookies, emails, connection
 * strings, SQL, or user content into `event`.
 */
export async function incomingRequestId(): Promise<string | undefined> {
  const current = currentAuthRequest()?.requestId;
  if (current) return current;
  try {
    const { headers } = await import("next/headers");
    const list = await headers();
    const incoming = list.get("x-request-id") ?? list.get("x-vercel-id");
    if (incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming)) return incoming;
  } catch {
    return undefined;
  }
  return undefined;
}

export function logAuthEvent(event: {
  stage: AuthStage;
  phase: AuthPhase;
  outcome: AuthOutcome;
  operation?: string;
  durationMs?: number;
  errorCategory?: string;
  causeCode?: string;
  requestId?: string;
}) {
  const requestId = event.requestId ?? currentAuthRequest()?.requestId;
  console.error("[auth]", {
    stage: event.stage,
    phase: event.phase,
    outcome: event.outcome,
    operation: event.operation,
    durationMs: event.durationMs,
    errorCategory: event.errorCategory,
    causeCode: event.causeCode,
    requestId,
  });
}
