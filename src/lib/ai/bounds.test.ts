import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_APP_MAX_ATTEMPTS,
  AI_INPUT_LIMITS,
  AI_SDK_MAX_RETRIES,
  AiCostError,
  afterProviderError,
  beforeProviderError,
  clipForAi,
  createAiDeadline,
  listeningPromptSource,
  persistError,
  shouldRefundUsage,
  vocabularyAiFields,
  withAppAttempts,
} from "@/lib/ai/bounds";
import { assertListeningDurationAllowed } from "@/lib/listening/transcribe";
import { ListeningError } from "@/lib/listening/errors";

describe("AI input clipping", () => {
  it("clips oversized user-controlled fields", () => {
    const longMeaning = "m".repeat(AI_INPUT_LIMITS.meaning + 40);
    const fields = vocabularyAiFields({
      word: "w".repeat(AI_INPUT_LIMITS.word + 10),
      meaning: longMeaning,
      partOfSpeech: "p".repeat(AI_INPUT_LIMITS.partOfSpeech + 5),
      topic: "t".repeat(AI_INPUT_LIMITS.topic + 5),
    });

    expect(fields.word?.length).toBe(AI_INPUT_LIMITS.word);
    expect(fields.meaning?.length).toBe(AI_INPUT_LIMITS.meaning);
    expect(fields.partOfSpeech?.length).toBe(AI_INPUT_LIMITS.partOfSpeech);
    expect(fields.topic?.length).toBe(AI_INPUT_LIMITS.topic);
  });

  it("prefers dialogue over duplicated transcript text", () => {
    const source = listeningPromptSource({
      transcript: "full transcript that should not be sent",
      sentences: [{ text: "Also unused when dialogue exists." }],
      dialogue: [
        { speaker: "A", displayName: "Ann", text: "Hello there" },
        { speaker: "B", displayName: "Bob", text: "Hi" },
      ],
    });

    expect(source.dialogue).toHaveLength(2);
    expect(source.transcript).toBeUndefined();
    expect(source.sentences).toBeUndefined();
  });
});

describe("shouldRefundUsage", () => {
  it("refunds only before_provider failures", () => {
    expect(shouldRefundUsage(beforeProviderError(new Error("EMPTY_CONTENT")))).toBe(
      true,
    );
    expect(shouldRefundUsage(new Error("AUDIO_DURATION_UNKNOWN"))).toBe(true);
    expect(shouldRefundUsage(new Error("OPENAI_NOT_CONFIGURED"))).toBe(true);

    expect(shouldRefundUsage(afterProviderError(new Error("AI_INVALID_RESPONSE")))).toBe(
      false,
    );
    expect(shouldRefundUsage(new Error("AI_DEADLINE_EXCEEDED"))).toBe(false);
    expect(
      shouldRefundUsage(persistError(new Error("db"), { transcript: "kept" })),
    ).toBe(false);
    expect(shouldRefundUsage(new Error("TRANSCRIPTION_FAILED"))).toBe(false);
  });
});

describe("withAppAttempts + deadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("bounds application retries and does not exceed max attempts", async () => {
    let calls = 0;
    await expect(
      withAppAttempts({
        attempts: AI_APP_MAX_ATTEMPTS,
        run: async () => {
          calls += 1;
          throw new Error("AI_INVALID_RESPONSE");
        },
      }),
    ).rejects.toThrow("AI_INVALID_RESPONSE");
    expect(calls).toBe(AI_APP_MAX_ATTEMPTS);
  });

  it("stops retrying after deadline expiry", async () => {
    const deadline = createAiDeadline(5);
    await new Promise((resolve) => setTimeout(resolve, 10));
    let calls = 0;
    await expect(
      withAppAttempts({
        attempts: 5,
        deadline,
        run: async () => {
          calls += 1;
          throw new Error("AI_INVALID_RESPONSE");
        },
      }),
    ).rejects.toMatchObject({ message: "AI_DEADLINE_EXCEEDED" });
    expect(calls).toBe(0);
    deadline.clear();
  });

  it("does not retry persist failures", async () => {
    let calls = 0;
    await expect(
      withAppAttempts({
        attempts: 3,
        run: async () => {
          calls += 1;
          throw persistError(new Error("db down"), { ok: true });
        },
      }),
    ).rejects.toBeInstanceOf(AiCostError);
    expect(calls).toBe(1);
  });
});

describe("audio duration gate", () => {
  it("rejects unknown and oversized duration before provider work", () => {
    expect(() => assertListeningDurationAllowed(null)).toThrow(AiCostError);
    expect(() => assertListeningDurationAllowed(undefined)).toThrow(AiCostError);
    expect(() => assertListeningDurationAllowed(Number.NaN)).toThrow(AiCostError);

    try {
      assertListeningDurationAllowed(null);
    } catch (error) {
      expect(error).toBeInstanceOf(AiCostError);
      expect((error as AiCostError).phase).toBe("before_provider");
      expect((error as AiCostError).cause).toBeInstanceOf(ListeningError);
      expect(shouldRefundUsage(error)).toBe(true);
    }

    expect(() => assertListeningDurationAllowed(60)).not.toThrow();
  });
});

describe("SDK retry configuration", () => {
  it("keeps explicit SDK retries low", () => {
    expect(AI_SDK_MAX_RETRIES).toBe(1);
    expect(AI_APP_MAX_ATTEMPTS).toBeLessThanOrEqual(3);
  });
});

describe("clipForAi", () => {
  it("clips editor-format and written-answer sized payloads", () => {
    expect(clipForAi("a".repeat(30_000), AI_INPUT_LIMITS.editorFormat).length).toBe(
      AI_INPUT_LIMITS.editorFormat,
    );
    expect(
      clipForAi("b".repeat(5_000), AI_INPUT_LIMITS.writtenAnswer).length,
    ).toBe(AI_INPUT_LIMITS.writtenAnswer);
  });
});
