import OpenAI from "openai";
import { z } from "zod";
import {
  buildDeterministicCoachNote,
  coachFactsForPrompt,
  hashCoachFacts,
  type CoachFacts,
} from "@/lib/billing/coach-model";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";

const NOTE_TTL_MS = 30 * 60 * 1000;
const NOTE_CACHE_VERSION = "v3";

const aiNoteSchema = z.object({
  summary: z.string().trim().min(1).max(600),
});

type NoteCacheEntry = {
  hash: string;
  note: string;
  expiresAt: number;
};

const noteCache = new Map<string, NoteCacheEntry>();

function cacheKey(userId: string, workspaceId: string) {
  return `${NOTE_CACHE_VERSION}:${userId}:${workspaceId}`;
}

export function clearCoachNoteCache() {
  noteCache.clear();
}

export async function resolveCoachNote(input: {
  userId: string;
  workspaceId: string;
  facts: CoachFacts;
  forceRefresh?: boolean;
}): Promise<{ note: string; source: "ai" | "deterministic" }> {
  const hash = hashCoachFacts(input.facts);
  const key = cacheKey(input.userId, input.workspaceId);
  const cached = noteCache.get(key);
  if (
    !input.forceRefresh &&
    cached &&
    cached.hash === hash &&
    cached.expiresAt > Date.now()
  ) {
    return { note: cached.note, source: "ai" };
  }

  const aiNote = await generateAiCoachNote(input.facts);
  const note = aiNote ?? buildDeterministicCoachNote(input.facts);
  const source = aiNote ? "ai" : "deterministic";

  if (aiNote) {
    noteCache.set(key, {
      hash,
      note: aiNote,
      expiresAt: Date.now() + NOTE_TTL_MS,
    });
  } else {
    noteCache.delete(key);
  }

  return { note, source };
}

async function generateAiCoachNote(facts: CoachFacts) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey, timeout: 20_000 });
    const system = await aiSystemPrompt(
      [
        "You write a short Learning Coach note for a language learner.",
        "Address the learner as you. Never call the learner Notoria or any product name.",
        "Return JSON only: {\"summary\":\"...\"}.",
        "Use only the supplied facts. Do not invent metrics, scores, words, levels, or activities.",
        "Never treat a CEFR label as the learner's assessed ability — session CEFR is a practice target, not a grade.",
        "Do not diagnose ability or claim improvement without evidence.",
        "If a fact is missing or zero, do not invent a stand-in value.",
        "Keep the summary to 2 or 3 concise sentences.",
        "Recommendations are chosen separately; do not invent new practice destinations.",
      ].join(" "),
    );

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(coachFactsForPrompt(facts)) },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;
    const parsed = aiNoteSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    return parsed.data.summary;
  } catch {
    return null;
  }
}
