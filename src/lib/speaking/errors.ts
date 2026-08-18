export const SPEAKING_ERROR_CODES = [
  "STREAM_NOT_CONFIGURED",
  "OPENAI_NOT_CONFIGURED",
  "INVALID_INPUT",
  "SESSION_NOT_FOUND",
  "SESSION_NOT_JOINABLE",
  "STREAM_CALL_FAILED",
  "UNAUTHORIZED",
] as const;

export type SpeakingErrorCode = (typeof SPEAKING_ERROR_CODES)[number];

export class SpeakingError extends Error {
  readonly code: SpeakingErrorCode;

  constructor(code: SpeakingErrorCode) {
    super(code);
    this.name = "SpeakingError";
    this.code = code;
  }
}

export function isSpeakingErrorCode(value: string): value is SpeakingErrorCode {
  return (SPEAKING_ERROR_CODES as readonly string[]).includes(value);
}
