const KNOWN_AI_CODES = new Set([
  "AI_FORBIDDEN",
  "AI_DISABLED",
  "AI_UNAVAILABLE",
  "AI_INVALID_REQUEST",
  "AI_EMPTY",
  "AI_QUOTA_EXCEEDED",
]);

/** Application failures that must not be shown as a sign-in problem. */
const SERVICE_CODES = new Set([
  "AUTH_UNAVAILABLE",
  "AUTHORIZATION_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "WORKSPACE_REQUIRED",
  "NO_WORKSPACE",
  "NO_ACTIVE_WORKSPACE",
]);

export type AiClientCode =
  | "AI_FORBIDDEN"
  | "AI_DISABLED"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_REQUEST"
  | "AI_EMPTY"
  | "AI_QUOTA_EXCEEDED";

/**
 * Map an AI HTTP payload to a client code.
 * 401 without a service/workspace code stays AI_FORBIDDEN (access), which
 * these widgets already render without signing the user out.
 * 503 and workspace/auth-service codes stay retryable.
 */
export function mapAiClientCode(
  status: number,
  code: string | undefined,
  options?: { quotaOn402?: boolean },
): AiClientCode {
  if (status === 503 || (code && SERVICE_CODES.has(code))) {
    return "AI_UNAVAILABLE";
  }
  if (code && KNOWN_AI_CODES.has(code)) {
    return code as AiClientCode;
  }
  if (options?.quotaOn402 && status === 402) return "AI_QUOTA_EXCEEDED";
  if (status === 401 || status === 403) return "AI_FORBIDDEN";
  return "AI_UNAVAILABLE";
}
