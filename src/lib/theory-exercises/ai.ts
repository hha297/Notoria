import OpenAI from "openai";
import {
  mapAiDraftsToTheoryExercises,
  theoryAiResponseSchema,
  type TheoryAiExerciseDraft,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryExercise, TheoryVocabWord } from "@/lib/theory-exercises/types";
import { theoryDocPlainText } from "@/lib/theory/content";
import type { JSONContent } from "@tiptap/react";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 90_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

const THEORY_EXERCISE_AI_PROMPT = `You generate practice exercises from a learner's free-form Theory notes.

Theory supplies the RULE / knowledge to practice. You invent the practice material.

## Step 0 — Theory focus
First decide what the Theory actually teaches. Write theoryFocus as 1–2 sentences.
Distinguish incidental example content from the learning target.
- If Theory teaches “verb requires form X on its complement”, blank the complement form / ending — not the verb.
- If Theory teaches verb conjugation, blank the verb form — not an unrelated noun.

## Step 1 — Learning target per exercise
For EVERY exercise set:
- learningObjective: what the learner must practice
- targetType: suffix | prefix | word_form | full_word | structure | concept
- hint: helps with THAT target only
- completedSentence: fully correct sentence/form after answering

## Step 2 — Invent practice around the target
Pipeline: Theory rule → learning target → INVENT fresh context → blank that isolates the target → hint.

You MUST invent new sentences, names, and vocabulary. Do NOT copy Theory examples.
Vocabulary list is optional inspiration only — invent freely if empty or insufficient.
Same answer/ending across many items is expected when drilling one form.

Never invent unsupported grammatical rules. Contexts/words may be invented freely.

## Blank placement
1. suffix: stem visible + ________ glued (no space). answer = ending only. sourceWord = base word.
2. prefix: ________ glued before stem.
3. word_form / full_word: blank the whole required form.
4. structure/concept: still one concrete answer.
5. Never blank incidental non-target words.

## Quantity (critical)
Return EXACTLY maxExercises items. Target set size is 20–30.
Pad with varied invented contexts that still test the SAME Theory rule until you hit maxExercises.
Do not stop early because Theory examples ran out — invent more practice.

## Other
1. Any language/subject; do not assume one language.
2. Prefer fill_blank; transformation when clearer; multiple_choice sparingly.
3. No abstract meta questions; no "/" alternate-list labels as answers.
4. skillLabel = Theory title when available.
5. JSON only:
{
  "theoryFocus": string,
  "exercises": [ {
    "type": "fill_blank" | "transformation" | "multiple_choice",
    "learningObjective": string,
    "targetType": "suffix" | "prefix" | "word_form" | "full_word" | "structure" | "concept",
    "sentence"?: string,
    "answer"?: string,
    "acceptedAnswers"?: string[],
    "sourceWord"?: string,
    "completedSentence"?: string,
    "promptWord"?: string,
    "prompt"?: string,
    "options"?: string[],
    "correctOption"?: string,
    "instruction"?: string,
    "skillLabel"?: string,
    "hint": string,
    "explanation"?: string,
    "materialSource"?: "theory" | "vocabulary" | "ai"
  } ]
}
6. fill_blank sentence MUST contain exactly one ________ marker.
7. No markdown.`;

async function requestExerciseBatch(input: {
  client: OpenAI;
  title: string;
  theoryPlainText: string;
  vocabularyWords: string[];
  maxExercises: number;
  batchIndex: number;
  avoidSentences?: string[];
}): Promise<TheoryAiExerciseDraft[]> {
  const completion = await input.client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.85,
    max_tokens: 8_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: THEORY_EXERCISE_AI_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          maxExercises: input.maxExercises,
          batch: input.batchIndex,
          theoryPlainText: input.theoryPlainText,
          vocabularyWords: input.vocabularyWords,
          avoidReusingTheseSentences: (input.avoidSentences ?? []).slice(0, 40),
          reminder:
            "Invent fresh practice contexts. Return EXACTLY maxExercises items. Same ending/answer across items is fine. Do not copy Theory examples.",
        }),
      },
    ],
  });

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const parsed = theoryAiResponseSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.exercises;
}

/**
 * AI-only Theory exercise generation. Invents practice material; Theory only supplies the rule.
 * Parallel batches + optional refill so sets reach the requested 20–30 size.
 */
export async function generateAiTheoryExercises(input: {
  theoryId: string;
  theoryTitle: string;
  doc: JSONContent;
  vocabulary?: TheoryVocabWord[];
  count?: number;
}): Promise<TheoryExercise[]> {
  const plainText = theoryDocPlainText(input.doc);
  if (!plainText.trim()) return [];

  const count = Math.min(Math.max(input.count ?? 24, 1), 30);
  const client = getOpenAIClient();
  const vocabularyWords = (input.vocabulary ?? []).slice(0, 60).map((w) => w.word);
  const theoryPlainText = plainText.slice(0, 12_000);

  const batchArgs = {
    client,
    title: input.theoryTitle,
    theoryPlainText,
    vocabularyWords,
  };

  // Over-request slightly per batch; models often under-deliver.
  const first = Math.ceil(count / 2) + 2;
  const second = Math.ceil(count / 2) + 2;
  const [batchA, batchB] = await Promise.all([
    requestExerciseBatch({ ...batchArgs, maxExercises: first, batchIndex: 1 }),
    requestExerciseBatch({ ...batchArgs, maxExercises: second, batchIndex: 2 }),
  ]);

  let drafts = [...batchA, ...batchB];
  let items = mapAiDraftsToTheoryExercises(
    input.theoryId,
    drafts,
    input.theoryTitle,
    count,
  );

  // Refill if validation/under-delivery left the set short.
  if (items.length < count) {
    const avoid = drafts
      .map((d) => d.sentence)
      .filter((s): s is string => Boolean(s));
    const need = count - items.length + 4;
    const refill = await requestExerciseBatch({
      ...batchArgs,
      maxExercises: Math.min(need, 16),
      batchIndex: 3,
      avoidSentences: avoid,
    });
    drafts = [...drafts, ...refill];
    items = mapAiDraftsToTheoryExercises(
      input.theoryId,
      drafts,
      input.theoryTitle,
      count,
    );
  }

  if (items.length === 0) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return items;
}
