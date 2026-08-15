import OpenAI from "openai";
import { applySpeakerNames, normalizeSpeakerId } from "@/lib/listening/speakers";
import { splitListeningSentences } from "@/lib/listening/select-type";
import type { ListeningSentence, ListeningUtterance } from "@/lib/listening/types";

function parseSpeakerMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const speakers = Array.isArray(record.speakers)
    ? record.speakers
    : Array.isArray(record.names)
      ? record.names
      : null;

  const map: Record<string, string> = {};

  if (speakers) {
    for (const item of speakers) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const id = typeof entry.id === "string" ? entry.id : typeof entry.speaker === "string" ? entry.speaker : "";
      const name =
        typeof entry.displayName === "string"
          ? entry.displayName
          : typeof entry.name === "string"
            ? entry.name
            : "";
      if (id && name.trim()) map[id] = name.trim();
    }
    return map;
  }

  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value.trim()) {
      map[key] = value.trim();
    }
  }

  return map;
}

function mergeConsecutiveUtterances(utterances: ListeningUtterance[]) {
  const merged: ListeningUtterance[] = [];

  for (const utterance of utterances) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === utterance.speaker) {
      last.text = `${last.text} ${utterance.text}`.replace(/\s+/g, " ").trim();
      last.end = utterance.end;
      last.displayName = last.displayName || utterance.displayName;
      continue;
    }
    merged.push({ ...utterance, order: merged.length });
  }

  return merged;
}

export async function inferSpeakerDisplayNames(input: {
  transcript: string;
  utterances: ListeningUtterance[];
}): Promise<{ utterances: ListeningUtterance[]; speakerMap: Record<string, string> }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || input.utterances.length === 0) {
    return { utterances: input.utterances, speakerMap: {} };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You map speaker labels to personal names for a language-learning transcript.

Rules:
- The spoken text is already transcribed. NEVER rewrite, translate, summarize, or alter it.
- Only assign a displayName when that speaker's real personal name is explicitly stated in THIS transcript.
- The name MUST appear in the original transcript text.
- If the name is not explicit or you are unsure, return null for that speaker.
- Never invent names. Never reuse names from other dialogues or examples.
- Never guess from gender, role, accent, or context.
- Never use titles like Teacher, Student, Man, or Woman as names.
- Return JSON only: { "speakers": [{ "id": "A", "displayName": null }] }`,
        },
        {
          role: "user",
          content: JSON.stringify({
            transcript: input.transcript,
            utterances: input.utterances.map((utterance) => ({
              speaker: utterance.speaker,
              text: utterance.text,
            })),
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { utterances: input.utterances, speakerMap: {} };
    }

    const parsed = parseSpeakerMap(JSON.parse(content) as unknown);
    return applySpeakerNames(input.utterances, parsed, input.transcript);
  } catch {
    return { utterances: input.utterances, speakerMap: {} };
  }
}

export async function assignDialogueSpeakers(input: {
  transcript: string;
  sentences: ListeningSentence[];
}): Promise<{ utterances: ListeningUtterance[]; speakerMap: Record<string, string> }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const sentences =
    input.sentences.length > 0
      ? input.sentences
      : splitListeningSentences(input.transcript).map((text) => ({
          text,
          start: 0,
          end: 0,
        }));

  if (!apiKey || sentences.length < 2) {
    return { utterances: [], speakerMap: {} };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You label speakers in an already-transcribed listening dialogue.

Rules:
- NEVER rewrite, translate, summarize, or change the sentence text.
- Assign each numbered sentence to speaker A, B, C, ... based on turn-taking in THIS audio only.
- Short replies such as "Joo", "Niin on", "Oho", "Yes", "Okay" are usually a different speaker from the previous longer line.
- If the lines go back and forth, use at least two speakers.
- If this is clearly one narrator listing words or instructions, assign every sentence to A.
- Only set displayName when that person's real name is explicitly stated in THIS transcript.
- If no name is stated, displayName must be null. Still keep speaker ids A, B, C.
- Never invent names. Never copy names from examples or from other lessons.
- Return JSON only:
{
  "speakers": [{ "id": "A", "displayName": null }, { "id": "B", "displayName": null }],
  "turns": [{ "index": 1, "speaker": "A" }, { "index": 2, "speaker": "B" }]
}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            transcript: input.transcript,
            sentences: sentences.map((sentence, index) => ({
              index: index + 1,
              text: sentence.text,
            })),
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return { utterances: [], speakerMap: {} };
    }

    const parsed = JSON.parse(content) as {
      speakers?: unknown;
      turns?: Array<{ index?: unknown; speaker?: unknown }>;
    };
    const speakerMap = parseSpeakerMap(parsed);
    const turns = Array.isArray(parsed.turns) ? parsed.turns : [];

    const utterances = sentences.map((sentence, index) => {
      const turn =
        turns.find((item) => Number(item.index) === index + 1) ??
        turns.find((item) => Number(item.index) === index) ??
        turns[index];
      const speaker = normalizeSpeakerId(
        typeof turn?.speaker === "string" || typeof turn?.speaker === "number"
          ? turn.speaker
          : "A",
      );
      return {
        speaker,
        displayName: speakerMap[speaker] ?? null,
        text: sentence.text,
        start: sentence.start,
        end: sentence.end,
        order: index,
      };
    });

    const named = applySpeakerNames(utterances, speakerMap, input.transcript);
    return {
      speakerMap: named.speakerMap,
      utterances: mergeConsecutiveUtterances(named.utterances),
    };
  } catch {
    return { utterances: [], speakerMap: {} };
  }
}
