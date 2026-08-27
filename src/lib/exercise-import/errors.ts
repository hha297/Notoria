export const EXERCISE_IMPORT_ERROR_CODES = [
  "CLOUDINARY_NOT_CONFIGURED",
  "OPENAI_NOT_CONFIGURED",
  "INVALID_FILE",
  "INVALID_FILE_TYPE",
  "FILE_TOO_LARGE",
  "INVALID_URL",
  "URL_FETCH_FAILED",
  "UNSUPPORTED_PARSE",
  "EMPTY_CONTENT",
  "ANALYSIS_FAILED",
  "GENERATION_FAILED",
  "GENERATION_UNAVAILABLE",
  "IMPORT_NOT_FOUND",
  "PROCESSING_FAILED",
  "ALREADY_PROCESSING",
  "UPLOAD_CANCELLED",
] as const;

export type ExerciseImportErrorCode =
  (typeof EXERCISE_IMPORT_ERROR_CODES)[number];

export class ExerciseImportError extends Error {
  readonly code: ExerciseImportErrorCode;

  constructor(code: ExerciseImportErrorCode) {
    super(code);
    this.name = "ExerciseImportError";
    this.code = code;
  }
}

export function isExerciseImportErrorCode(
  value: string,
): value is ExerciseImportErrorCode {
  return (EXERCISE_IMPORT_ERROR_CODES as readonly string[]).includes(value);
}

export function toExerciseImportError(error: unknown): ExerciseImportError {
  if (error instanceof ExerciseImportError) {
    return error;
  }

  if (error instanceof Error && isExerciseImportErrorCode(error.message)) {
    return new ExerciseImportError(error.message);
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
    return new ExerciseImportError("OPENAI_NOT_CONFIGURED");
  }

  if (
    status === 429 ||
    code === "insufficient_quota" ||
    code === "credit_balance_exhausted"
  ) {
    return new ExerciseImportError("GENERATION_UNAVAILABLE");
  }

  if (status && status >= 400) {
    return new ExerciseImportError("GENERATION_FAILED");
  }

  return new ExerciseImportError("PROCESSING_FAILED");
}
