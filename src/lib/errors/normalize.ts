import { AppError, type ErrorKind, type ErrorResource } from "./types";

const RESOURCE_NOT_FOUND_CODES = new Set([
  "PASSAGE_NOT_FOUND",
  "SET_NOT_FOUND",
  "ATTEMPT_NOT_FOUND",
  "NOT_FOUND",
  "FOLDER_NOT_FOUND",
  "WORKSPACE_NOT_FOUND",
]);

function statusFromError(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status > 0) return status;
  }
  if ("statusCode" in error) {
    const status = Number((error as { statusCode?: unknown }).status);
    if (Number.isFinite(status) && status > 0) return status;
  }
  return undefined;
}

function codeFromError(error: unknown): string {
  if (error instanceof AppError) return error.kind;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}

function resourceFromPath(pathname?: string | null): ErrorResource | undefined {
  if (!pathname) return undefined;
  if (pathname.includes("/exercises")) return "exercise";
  if (pathname.includes("/vocabulary")) return "vocabulary";
  if (pathname.includes("/reading")) return "reading";
  if (pathname.includes("/writing")) return "writing";
  if (pathname.includes("/theory")) return "theory";
  if (pathname.includes("/listening")) return "listening";
  if (pathname.includes("/speaking")) return "speaking";
  return undefined;
}

function kindFromStatus(status: number): ErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimit";
  if (status >= 500) return "server";
  return "server";
}

/**
 * Map any thrown / fetch / provider error into a stable AppError for UI mapping.
 * Never includes stack traces or provider payloads in the message.
 */
export function normalizeError(
  error: unknown,
  options?: {
    resource?: ErrorResource;
    pathname?: string | null;
    referenceId?: string;
  },
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const resource =
    options?.resource ?? resourceFromPath(options?.pathname);
  const referenceId =
    options?.referenceId ??
    (typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : undefined);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new AppError({
      kind: "offline",
      statusCode: 0,
      referenceId,
      resource,
      cause: error,
    });
  }

  const code = codeFromError(error).toUpperCase();
  const status = statusFromError(error);

  if (code === "UNAUTHORIZED" || code === "UNAUTHENTICATED" || status === 401) {
    return new AppError({
      kind: "unauthorized",
      statusCode: 401,
      referenceId,
      resource,
      cause: error,
    });
  }

  if (
    code === "FORBIDDEN" ||
    code === "ACCESS_DENIED" ||
    code === "AI_FORBIDDEN" ||
    status === 403
  ) {
    return new AppError({
      kind: "forbidden",
      statusCode: 403,
      referenceId,
      resource,
      cause: error,
    });
  }

  if (
    status === 404 ||
    RESOURCE_NOT_FOUND_CODES.has(code) ||
    code.endsWith("_NOT_FOUND")
  ) {
    return new AppError({
      kind: resource ? "resourceNotFound" : "notFound",
      statusCode: 404,
      referenceId,
      resource,
      cause: error,
    });
  }

  if (
    status === 429 ||
    code === "RATE_LIMIT" ||
    code === "AI_QUOTA_EXCEEDED" ||
    code === "TOO_MANY_REQUESTS" ||
    code === "INSUFFICIENT_QUOTA"
  ) {
    let retryAfterSeconds: number | undefined;
    if (
      typeof error === "object" &&
      error !== null &&
      "retryAfter" in error
    ) {
      const value = Number((error as { retryAfter?: unknown }).retryAfter);
      if (Number.isFinite(value) && value > 0) retryAfterSeconds = value;
    }
    return new AppError({
      kind: "rateLimit",
      statusCode: 429,
      referenceId,
      resource,
      retryAfterSeconds,
      cause: error,
    });
  }

  if (
    code === "TIMEOUT" ||
    code === "ABORT_ERR" ||
    code === "REQUEST_TIMEOUT" ||
    (error instanceof Error && /timeout/i.test(error.message))
  ) {
    return new AppError({
      kind: "timeout",
      statusCode: 408,
      referenceId,
      resource,
      cause: error,
    });
  }

  if (
    code === "NETWORK_ERROR" ||
    code === "FAILED_TO_FETCH" ||
    (error instanceof TypeError && /fetch/i.test(error.message)) ||
    (error instanceof Error &&
      /network|failed to fetch|load failed/i.test(error.message))
  ) {
    return new AppError({
      kind: "network",
      statusCode: 0,
      referenceId,
      resource,
      cause: error,
    });
  }

  if (status && status >= 400) {
    return new AppError({
      kind: kindFromStatus(status),
      statusCode: status,
      referenceId,
      resource,
      cause: error,
    });
  }

  return new AppError({
    kind: "server",
    statusCode: 500,
    referenceId,
    resource,
    cause: error,
  });
}

/** Safe server-side log helper — never send the result to the client UI. */
export function logTechnicalError(
  scope: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  const normalized = normalizeError(error);
  console.error(`[${scope}]`, {
    kind: normalized.kind,
    statusCode: normalized.statusCode,
    referenceId: normalized.referenceId,
    message: error instanceof Error ? error.message : String(error),
    ...extra,
  });
}
