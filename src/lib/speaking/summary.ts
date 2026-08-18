import OpenAI from "openai";
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !input.transcript.trim()) {
    return null;
  }

  const client = new OpenAI({ apiKey, timeout: 45_000 });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: speakingFeedbackPrompt(input),
      },
      {
        role: "user",
        content: input.transcript.slice(0, 24_000),
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || null;
}
