import { describe, expect, it } from "vitest";
import {
  formatOpenAiTranscript,
  openAiTranscriptionLanguage,
  OpenAiTranscriptCollector,
  orderOpenAiTranscriptEntries,
  parseOpenAiTranscriptState,
  type OpenAiTranscriptEntry,
} from "@/lib/speaking/openai-transcript";

function entry(
  partial: Partial<OpenAiTranscriptEntry> &
    Pick<OpenAiTranscriptEntry, "id" | "role" | "text">,
): OpenAiTranscriptEntry {
  return {
    itemId: null,
    previousItemId: null,
    responseId: null,
    eventType: "test",
    status: "ok",
    errorMessage: null,
    playbackStatus: null,
    receivedAt: "2020-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("openAiTranscriptionLanguage", () => {
  it("accepts supported ISO codes and strips regions", () => {
    expect(openAiTranscriptionLanguage("fi")).toBe("fi");
    expect(openAiTranscriptionLanguage("en-US")).toBe("en");
    expect(openAiTranscriptionLanguage("xx")).toBeUndefined();
    expect(openAiTranscriptionLanguage(null)).toBeUndefined();
  });
});

describe("orderOpenAiTranscriptEntries", () => {
  it("follows previous_item_id chains", () => {
    const ordered = orderOpenAiTranscriptEntries([
      entry({
        id: "b",
        role: "tutor",
        text: "Hi",
        itemId: "item-b",
        previousItemId: "item-a",
        receivedAt: "2020-01-01T00:00:02.000Z",
      }),
      entry({
        id: "a",
        role: "user",
        text: "Hello",
        itemId: "item-a",
        previousItemId: null,
        receivedAt: "2020-01-01T00:00:01.000Z",
      }),
    ]);
    expect(ordered.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("keeps latest entry per itemId", () => {
    const ordered = orderOpenAiTranscriptEntries([
      entry({
        id: "1",
        role: "user",
        text: "old",
        itemId: "same",
        receivedAt: "2020-01-01T00:00:01.000Z",
      }),
      entry({
        id: "2",
        role: "user",
        text: "new",
        itemId: "same",
        receivedAt: "2020-01-01T00:00:02.000Z",
      }),
    ]);
    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.text).toBe("new");
  });
});

describe("OpenAiTranscriptCollector", () => {
  it("captures user and tutor turns without rewriting text", () => {
    const c = new OpenAiTranscriptCollector();
    c.handleServerEvent({
      type: "conversation.item.created",
      item: {
        id: "u1",
        role: "user",
        previous_item_id: null,
      },
    });
    c.handleServerEvent({
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "e1",
      item_id: "u1",
      transcript: "I goes to store",
    });
    c.handleServerEvent({
      type: "conversation.item.created",
      item: {
        id: "t1",
        role: "assistant",
        previous_item_id: "u1",
      },
    });
    c.handleServerEvent({
      type: "response.output_audio_transcript.done",
      event_id: "e2",
      item_id: "t1",
      response_id: "r1",
      transcript: "Nice try.",
    });

    const snap = c.snapshot();
    expect(snap.entries.map((e) => e.text)).toEqual([
      "I goes to store",
      "Nice try.",
    ]);
    expect(formatOpenAiTranscript(snap)).toContain("Learner: I goes to store");
    expect(formatOpenAiTranscript(snap)).toContain("Notoria Tutor: Nice try.");
  });

  it("marks truncated tutor playback", () => {
    const c = new OpenAiTranscriptCollector();
    c.handleServerEvent({
      type: "conversation.item.truncated",
      item_id: "t1",
    });
    c.handleServerEvent({
      type: "response.output_audio_transcript.done",
      event_id: "e1",
      item_id: "t1",
      response_id: "r1",
      transcript: "This would have been a long answer",
    });
    const snap = c.snapshot();
    expect(snap.entries[0]?.playbackStatus).toBe("truncated");
    expect(formatOpenAiTranscript(snap)).toContain("[interrupted]");
  });
});

describe("parseOpenAiTranscriptState", () => {
  it("reads production and legacy debug envelopes", () => {
    const prod = {
      status: "ready",
      entries: [],
      errorMessage: null,
      updatedAt: "2020-01-01T00:00:00.000Z",
    };
    expect(parseOpenAiTranscriptState(prod)?.status).toBe("ready");
    expect(
      parseOpenAiTranscriptState({
        openai: prod,
        stream: { status: "ready" },
      })?.status,
    ).toBe("ready");
    expect(parseOpenAiTranscriptState(null)).toBeNull();
  });
});
