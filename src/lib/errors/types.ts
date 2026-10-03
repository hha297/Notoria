/**
 * Shared error kinds and view models for user-facing error UI.
 * Technical details stay on the server / logs — never render them to users.
 */

export type ErrorKind =
  | "notFound"
  | "unauthorized"
  | "forbidden"
  | "rateLimit"
  | "server"
  | "network"
  | "offline"
  | "timeout"
  | "resourceNotFound";

export type ErrorResource =
  | "exercise"
  | "vocabulary"
  | "reading"
  | "writing"
  | "theory"
  | "listening"
  | "speaking"
  | "folder"
  | "generic";

export type ErrorAction = {
  labelKey: string;
  href?: string;
  /** When true, use router.back() instead of href. */
  back?: boolean;
  /** When true, call error boundary reset(). */
  reset?: boolean;
  /** When true, reload the current page (fallback when no reset handler). */
  reload?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
};

export type ErrorViewModel = {
  kind: ErrorKind;
  statusCode: number;
  /** next-intl key under errorPages.* */
  titleKey: string;
  /** next-intl key under errorPages.* */
  descriptionKey: string;
  primaryAction: ErrorAction;
  secondaryAction?: ErrorAction;
  tertiaryAction?: ErrorAction;
  referenceId?: string;
  /** Seconds until retry is allowed (429). */
  retryAfterSeconds?: number;
  resource?: ErrorResource;
};

export class AppError extends Error {
  readonly kind: ErrorKind;
  readonly statusCode: number;
  readonly resource?: ErrorResource;
  readonly referenceId?: string;
  readonly retryAfterSeconds?: number;
  readonly digest?: string;

  constructor(input: {
    kind: ErrorKind;
    statusCode: number;
    message?: string;
    resource?: ErrorResource;
    referenceId?: string;
    retryAfterSeconds?: number;
    cause?: unknown;
  }) {
    super(input.message ?? input.kind);
    this.name = "AppError";
    this.kind = input.kind;
    this.statusCode = input.statusCode;
    this.resource = input.resource;
    this.referenceId = input.referenceId;
    this.retryAfterSeconds = input.retryAfterSeconds;
    if (input.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = input.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
