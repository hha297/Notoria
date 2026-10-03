export const READING_ERROR_CODES = [
  "UNAUTHORIZED",
  "OPENAI_NOT_CONFIGURED",
  "AI_DISABLED",
  "AI_QUOTA_EXCEEDED",
  "INVALID_INPUT",
  "INVALID_FILE",
  "INVALID_FILE_TYPE",
  "FILE_TOO_LARGE",
  "EMPTY_CONTENT",
  "SCANNED_PDF",
  "UNSUPPORTED_PARSE",
  "PASSAGE_NOT_FOUND",
  "SET_NOT_FOUND",
  "ATTEMPT_NOT_FOUND",
  "SET_NOT_READY",
  "GENERATION_FAILED",
  "GENERATION_UNAVAILABLE",
  "VALIDATION_FAILED",
  "GRADING_FAILED",
  "ATTEMPT_NOT_EDITABLE",
  "PROCESSING_FAILED",
] as const;

export type ReadingErrorCode = (typeof READING_ERROR_CODES)[number];

export class ReadingError extends Error {
  readonly code: ReadingErrorCode;

  constructor(code: ReadingErrorCode) {
    super(code);
    this.name = "ReadingError";
    this.code = code;
  }
}

export function isReadingErrorCode(value: string): value is ReadingErrorCode {
  return (READING_ERROR_CODES as readonly string[]).includes(value);
}

export function toReadingError(error: unknown): ReadingError {
  if (error instanceof ReadingError) {
    return error;
  }

  if (error instanceof Error && isReadingErrorCode(error.message)) {
    return new ReadingError(error.message);
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
    return new ReadingError("OPENAI_NOT_CONFIGURED");
  }

  if (
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted"
  ) {
    return new ReadingError("GENERATION_UNAVAILABLE");
  }

  if (status && status >= 400) {
    return new ReadingError("GENERATION_FAILED");
  }

  return new ReadingError("PROCESSING_FAILED");
}
