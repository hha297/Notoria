import {
  AI_INPUT_LIMITS,
  AI_OUTPUT_TOKENS,
  clipForAi,
} from "@/lib/ai/bounds";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { speakingFeedbackPrompt } from "@/lib/speaking/instructions";
import { isSpeakingTutorUserId } from "@/lib/speaking/stream";

type TranscriptItem = {
  speaker_id?: string;
  text?: string;
};

export function parseTranscriptJsonl(raw: string) {
  const items: TranscriptItem[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      items.push(JSON.parse(trimmed) as TranscriptItem);
    } catch {
      // Skip malformed lines from Stream's JSONL dump.
    }
  }
  return items;
}

export function formatSpeakingTranscript(items: TranscriptItem[]) {
  return items
    .map((item) => {
      const text = item.text?.trim();
      if (!text) return null;
      const speaker = isSpeakingTutorUserId(item.speaker_id)
        ? "Notoria Tutor"
        : "Learner";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function summarizeSpeakingSession(input: {
  language: string;
  cefrLevel?: string | null;
  topic?: string | null;
  title: string;
  transcript: string;
}) {
  const transcript = clipForAi(
    input.transcript,
    AI_INPUT_LIMITS.speakingTranscript,
  );
  if (!transcript) {
    return null;
  }

  const client = createOpenAiClient({ timeoutMs: 45_000, requireKey: false });
  if (!client) {
    return null;
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: AI_OUTPUT_TOKENS.speakingSummary,
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(speakingFeedbackPrompt(input), {
          responseStyle: true,
          correctionStyle: true,
        }),
      },
      {
        role: "user",
        content: transcript,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || null;
}
