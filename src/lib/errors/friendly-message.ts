/**
 * Client helper: map any failure to a stable i18n key under `errorPages.*`
 * for toasts / inline copy without leaking technical details.
 */
import { normalizeError, type ErrorKind } from "@/lib/errors";

const KIND_DESCRIPTION_KEY: Record<ErrorKind, string> = {
  notFound: "notFound.description",
  resourceNotFound: "resources.generic.description",
  unauthorized: "unauthorized.description",
  forbidden: "forbidden.description",
  rateLimit: "rateLimit.description",
  server: "server.description",
  network: "network.description",
  offline: "offline.description",
  timeout: "timeout.description",
};

export function friendlyErrorDescriptionKey(error: unknown): string {
  return KIND_DESCRIPTION_KEY[normalizeError(error).kind];
}

export function shouldSuppressSuccessAfterError(error: unknown): boolean {
  return Boolean(error);
}
