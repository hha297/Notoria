import { beforeEach, describe, expect, it, vi } from "vitest";
import { afterProviderError, beforeProviderError } from "@/lib/ai/bounds";
import { ListeningError } from "@/lib/listening/errors";

const waitUntilReady = vi.fn();
const submit = vi.fn();
const sentences = vi.fn();

vi.mock("assemblyai", () => ({
  AssemblyAI: class {
    transcripts = {
      waitUntilReady,
      submit,
      sentences,
    };
  },
}));

vi.mock("@/lib/listening/infer-speakers", () => ({
  inferSpeakerDisplayNames: vi.fn(async (input: { utterances: unknown }) => ({
    utterances: input.utterances,
    speakerMap: {},
  })),
  assignDialogueSpeakers: vi.fn(async () => ({
    utterances: [],
    speakerMap: {},
  })),
}));

describe("transcribeListeningMedia bounds", () => {
  beforeEach(() => {
    vi.resetModules();
    waitUntilReady.mockReset();
    submit.mockReset();
    sentences.mockReset();
    process.env.ASSEMBLYAI_API_KEY = "test-key";
    sentences.mockResolvedValue({ sentences: [] });
  });

  it("rejects unknown duration before any AssemblyAI submit", async () => {
    const { transcribeListeningMedia } = await import(
      "@/lib/listening/transcribe"
    );
    await expect(
      transcribeListeningMedia({
        audioUrl: "https://example.com/a.mp3",
        durationSeconds: null,
      }),
    ).rejects.toMatchObject({
      phase: "before_provider",
      message: "AUDIO_DURATION_UNKNOWN",
    });
    expect(submit).not.toHaveBeenCalled();
  });

  it("reuses an existing AssemblyAI job id instead of resubmitting", async () => {
    waitUntilReady.mockResolvedValue({
      id: "job-existing",
      status: "completed",
      text: "Hello world.",
      audio_duration: 12,
      language_code: "en",
      words: [
        { text: "Hello", start: 0, end: 400, speaker: "A" },
        { text: "world.", start: 400, end: 800, speaker: "A" },
      ],
      utterances: [
        {
          speaker: "A",
          text: "Hello world.",
          start: 0,
          end: 800,
        },
      ],
    });

    const { transcribeListeningMedia } = await import(
      "@/lib/listening/transcribe"
    );
    const result = await transcribeListeningMedia({
      audioUrl: "https://example.com/a.mp3",
      durationSeconds: 12,
      existingAssemblyId: "job-existing",
    });

    expect(submit).not.toHaveBeenCalled();
    expect(waitUntilReady).toHaveBeenCalledWith(
      "job-existing",
      expect.objectContaining({ pollingTimeout: expect.any(Number) }),
    );
    expect(result.transcript).toBe("Hello world.");
    expect(result.transcriptionData.assemblyTranscriptId).toBe("job-existing");
  });

  it("persists submitted job id via callback for later reuse", async () => {
    submit.mockResolvedValue({ id: "job-new" });
    waitUntilReady.mockResolvedValue({
      id: "job-new",
      status: "completed",
      text: "Reuse me.",
      audio_duration: 8,
      language_code: "en",
      words: [{ text: "Reuse", start: 0, end: 300, speaker: null }],
      utterances: [],
    });

    const onJobSubmitted = vi.fn();
    const { transcribeListeningMedia } = await import(
      "@/lib/listening/transcribe"
    );
    await transcribeListeningMedia({
      audioUrl: "https://example.com/a.mp3",
      durationSeconds: 8,
      onJobSubmitted,
    });

    expect(onJobSubmitted).toHaveBeenCalledWith("job-new");
  });

  it("does not start a second paid job after poll timeout", async () => {
    submit.mockResolvedValue({ id: "job-1" });
    waitUntilReady.mockRejectedValue(new Error("polling timeout"));

    const { transcribeListeningMedia } = await import(
      "@/lib/listening/transcribe"
    );
    await expect(
      transcribeListeningMedia({
        audioUrl: "https://example.com/a.mp3",
        durationSeconds: 10,
        languageHint: "fi",
      }),
    ).rejects.toMatchObject({ phase: "after_provider" });

    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("failure phase helpers used by refunds", () => {
  it("marks duration errors as before_provider", () => {
    const error = beforeProviderError(new ListeningError("AUDIO_TOO_LONG"));
    expect(error.phase).toBe("before_provider");
  });

  it("marks poll failures as after_provider", () => {
    const error = afterProviderError(new Error("timeout"));
    expect(error.phase).toBe("after_provider");
  });
});
