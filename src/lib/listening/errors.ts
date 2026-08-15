export const LISTENING_ERROR_CODES = [
  "CLOUDINARY_NOT_CONFIGURED",
  "ASSEMBLYAI_NOT_CONFIGURED",
  "OPENAI_NOT_CONFIGURED",
  "INVALID_FILE",
  "INVALID_FILE_TYPE",
  "FILE_TOO_LARGE",
  "INVALID_URL",
  "UNSUPPORTED_MEDIA_URL",
  "MEDIA_UNAVAILABLE",
  "MEDIA_TOO_LONG",
  "MEDIA_EXTRACTION_FAILED",
  "MEDIA_SOURCE_BLOCKED",
  "EXTRACTOR_NOT_CONFIGURED",
  "TRANSCRIPTION_FAILED",
  "GENERATION_FAILED",
  "GENERATION_UNAVAILABLE",
  "VALIDATION_FAILED",
  "LESSON_NOT_FOUND",
  "PROCESSING_FAILED",
  "EMPTY_TRANSCRIPT",
] as const;

export type ListeningErrorCode = (typeof LISTENING_ERROR_CODES)[number];

export class ListeningError extends Error {
  readonly code: ListeningErrorCode;

  constructor(code: ListeningErrorCode) {
    super(code);
    this.name = "ListeningError";
    this.code = code;
  }
}

export function isListeningErrorCode(
  value: string,
): value is ListeningErrorCode {
  return (LISTENING_ERROR_CODES as readonly string[]).includes(value);
}

export function toListeningError(error: unknown): ListeningError {
  if (error instanceof ListeningError) {
    return error;
  }

  if (error instanceof Error && isListeningErrorCode(error.message)) {
    return new ListeningError(error.message);
  }

  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (status === 401 || status === 403) {
    return new ListeningError("OPENAI_NOT_CONFIGURED");
  }

  if (
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted"
  ) {
    return new ListeningError("GENERATION_UNAVAILABLE");
  }

  if (status && status >= 400) {
    return new ListeningError("GENERATION_FAILED");
  }

  return new ListeningError("PROCESSING_FAILED");
}
