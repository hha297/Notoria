/**
 * Shared cost/duration bounds for paid AI work.
 * Usage reservations still gate quota; this module bounds what each call may spend.
 */

export const AI_INPUT_LIMITS = {
  word: 120,
  meaning: 500,
  topic: 120,
  partOfSpeech: 64,
  transcript: 24_000,
  utteranceText: 800,
  sentenceText: 800,
  editorFormat: 20_000,
  writtenAnswer: 2_000,
  writtenPrompt: 1_000,
  passage: 18_000,
  theory: 12_000,
  importText: 20_000,
  vocabNotes: 20_000,
  contentImport: 24_000,
  speakingTranscript: 24_000,
  title: 200,
} as const;

export const AI_OUTPUT_TOKENS = {
  coachChat: 800,
  coachNote: 400,
  speakerInfer: 1_200,
  contentImport: 4_000,
  defaultMini: 2_000,
  theoryBatch: 8_000,
  theoryValidate: 3_500,
  editorFormat: 8_000,
  vocabNotesFormat: 4_000,
  readingOcr: 4_000,
  readingGenerate: 6_000,
  readingGrade: 4_000,
  importVision: 8_000,
  importGenerate: 8_000,
  exerciseFillBlank: 2_500,
  exerciseContextual: 2_500,
  formSentence: 650,
  writingCheck: 900,
  writingImprove: 500,
  writingContinue: 250,
  speakingSummary: 900,
  vocabSpelling: 160,
  vocabMeaning: 280,
  sentenceGloss: 200,
  sentenceGlossBatch: 4_000,
} as const;

/** Explicit SDK retries (OpenAI default is 2). Keep low to bound spend. */
export const AI_SDK_MAX_RETRIES = 1;

/** Application-level retries of a full model call (initial attempt + these). */
export const AI_APP_MAX_ATTEMPTS = 2;

export const AI_DEADLINES_MS = {
  default: 120_000,
  listeningTranscribe: 240_000,
  listeningGenerate: 180_000,
  theoryGenerate: 180_000,
  readingOcr: 180_000,
  readingGrade: 90_000,
  importExtract: 120_000,
  importGenerate: 180_000,
  editorFormat: 90_000,
} as const;

/** Codes that never reached a billable provider call. */
const BEFORE_PROVIDER_CODES = new Set([
  "UNAUTHORIZED",
  "EMPTY_CONTENT",
  "EMPTY_TRANSCRIPT",
  "AUDIO_TOO_LONG",
  "AUDIO_DURATION_UNKNOWN",
  "INVALID_INPUT",
  "INVALID_FILE",
  "INVALID_FILE_TYPE",
  "FILE_TOO_LARGE",
  "SET_NOT_READY",
  "ATTEMPT_NOT_EDITABLE",
  "LESSON_NOT_FOUND",
  "PASSAGE_NOT_FOUND",
  "IMPORT_NOT_FOUND",
  "OPENAI_NOT_CONFIGURED",
  "ASSEMBLYAI_NOT_CONFIGURED",
  "AI_DISABLED",
  "AI_QUOTA_EXCEEDED",
  "AI_FORBIDDEN",
  "AI_PAID_OPS_STOPPED",
  "PRO_REQUIRED",
  "PREMIUM_REQUIRED",
  "JOB_LOCK_LOST",
]);

/**
 * Note: AI_CANCELLED / AbortError are after_provider — cancellation does not
 * refund quota and does not imply provider usage was free.
 */

export type AiCostPhase = "before_provider" | "after_provider" | "persist";

export class AiCostError extends Error {
  readonly phase: AiCostPhase;
  readonly payload: unknown;
  readonly cause: unknown;

  constructor(
    phase: AiCostPhase,
    message: string,
    options?: { cause?: unknown; payload?: unknown },
  ) {
    super(message);
    this.name = "AiCostError";
    this.phase = phase;
    this.cause = options?.cause;
    this.payload = options?.payload ?? null;
  }
}

export function beforeProviderError(
  error: unknown,
  message = "BEFORE_PROVIDER",
): AiCostError {
  if (error instanceof AiCostError) return error;
  const code =
    error instanceof Error && error.message ? error.message : message;
  return new AiCostError("before_provider", code, { cause: error });
}

export function afterProviderError(
  error: unknown,
  message = "AFTER_PROVIDER",
): AiCostError {
  if (error instanceof AiCostError) return error;
  const code =
    error instanceof Error && error.message ? error.message : message;
  return new AiCostError("after_provider", code, { cause: error });
}

export function persistError(
  error: unknown,
  payload: unknown,
  message = "PERSIST_FAILED",
): AiCostError {
  if (error instanceof AiCostError && error.phase === "persist") return error;
  const code =
    error instanceof Error && error.message ? error.message : message;
  return new AiCostError("persist", code, { cause: error, payload });
}

/**
 * Refund only when we are sure no billable provider work started.
 * Timeouts and cancellations are treated as after_provider (no refund).
 */
export function shouldRefundUsage(error: unknown): boolean {
  if (error instanceof AiCostError) {
    return error.phase === "before_provider";
  }
  if (error instanceof Error && BEFORE_PROVIDER_CODES.has(error.message)) {
    return true;
  }
  return false;
}

export function clipForAi(
  value: string | null | undefined,
  max: number,
): string {
  const text = (value ?? "").trim();
  if (text.length <= max) return text;
  return text.slice(0, max);
}

export function clipOptional(
  value: string | null | undefined,
  max: number,
): string | null {
  const clipped = clipForAi(value, max);
  return clipped.length > 0 ? clipped : null;
}

export type AiDeadline = {
  signal: AbortSignal;
  expired: () => boolean;
  remainingMs: () => number;
  throwIfExpired: () => void;
  clear: () => void;
};

export function createAiDeadline(totalMs: number, now = Date.now()): AiDeadline {
  const controller = new AbortController();
  const expiresAt = now + Math.max(1, totalMs);
  const timer = setTimeout(() => {
    controller.abort();
  }, Math.max(1, totalMs));
  timer.unref?.();

  return {
    signal: controller.signal,
    expired: () => Date.now() >= expiresAt || controller.signal.aborted,
    remainingMs: () => Math.max(0, expiresAt - Date.now()),
    throwIfExpired: () => {
      if (Date.now() >= expiresAt || controller.signal.aborted) {
        throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
      }
    },
    clear: () => clearTimeout(timer),
  };
}

export async function withAppAttempts<T>(input: {
  attempts?: number;
  deadline?: AiDeadline;
  run: (attempt: number) => Promise<T>;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}): Promise<T> {
  const max = Math.max(1, input.attempts ?? AI_APP_MAX_ATTEMPTS);
  let lastError: unknown;
  for (let attempt = 1; attempt <= max; attempt += 1) {
    input.deadline?.throwIfExpired();
    try {
      return await input.run(attempt);
    } catch (error) {
      lastError = error;
      const retry =
        attempt < max &&
        (input.shouldRetry?.(error, attempt) ?? isRetryableModelError(error));
      if (!retry) throw error;
      input.deadline?.throwIfExpired();
    }
  }
  throw lastError;
}

export function isRetryableModelError(error: unknown): boolean {
  if (error instanceof AiCostError && error.phase !== "before_provider") {
    // Invalid JSON / empty model output may retry; persist and deadline do not.
    if (error.message === "AI_DEADLINE_EXCEEDED") return false;
    if (error.phase === "persist") return false;
  }
  if (!(error instanceof Error)) return false;
  const code = error.message;
  return (
    code === "AI_INVALID_RESPONSE" ||
    code === "VALIDATION_FAILED" ||
    code === "GENERATION_FAILED" ||
    code === "EMPTY_CONTENT"
  );
}

/**
 * Prefer structured turns over a duplicated full transcript.
 * Cap every text field before it reaches the model.
 */
export function listeningPromptSource(input: {
  transcript: string;
  sentences?: Array<{ text: string }>;
  dialogue?: Array<{ speaker: string; displayName: string | null; text: string }>;
}) {
  const dialogue = (input.dialogue ?? [])
    .slice(0, 200)
    .map((turn) => ({
      speaker: turn.speaker,
      displayName: turn.displayName,
      text: clipForAi(turn.text, AI_INPUT_LIMITS.utteranceText),
    }));

  if (dialogue.length > 0) {
    return {
      dialogue,
      transcript: undefined as string | undefined,
      sentences: undefined as Array<{ index: number; text: string }> | undefined,
    };
  }

  const sentences = (input.sentences ?? [])
    .slice(0, 400)
    .map((sentence, index) => ({
      index: index + 1,
      text: clipForAi(sentence.text, AI_INPUT_LIMITS.sentenceText),
    }))
    .filter((sentence) => sentence.text.length > 0);

  if (sentences.length > 0) {
    return {
      dialogue: undefined,
      sentences,
      transcript: undefined as string | undefined,
    };
  }

  return {
    dialogue: undefined,
    sentences: undefined,
    transcript: clipForAi(input.transcript, AI_INPUT_LIMITS.transcript),
  };
}

export function vocabularyAiFields(input: {
  word?: string | null;
  meaning?: string | null;
  partOfSpeech?: string | null;
  topic?: string | null;
}) {
  return {
    word: clipOptional(input.word, AI_INPUT_LIMITS.word),
    meaning: clipOptional(input.meaning, AI_INPUT_LIMITS.meaning),
    partOfSpeech: clipOptional(input.partOfSpeech, AI_INPUT_LIMITS.partOfSpeech),
    topic: clipOptional(input.topic, AI_INPUT_LIMITS.topic),
  };
}
