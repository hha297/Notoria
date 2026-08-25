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

## Step 1 — Learning target per exercise
For EVERY exercise set:
- learningObjective: what the learner must practice
- targetType: suffix | prefix | word_form | full_word | structure | concept
- hint: helps with THAT target only
- completedSentence: fully correct sentence/form after answering

## Step 2 — Invent practice
Pipeline: Theory rule → learning target → invent fresh context → one full-word blank → hint.

Never invent unsupported grammatical rules.
Never copy Theory example sentences.
Never put the answer (or a near-copy) in the sentence outside the blank.
The blank slot is the ONLY place the target form appears — do not also write it before or after ________.
Never put translation glosses like "(about)" in the sentence — put meaning clues only in hint.

## CRITICAL — language of practice material
Detect the language being studied from Theory + studyLanguage.
Write sentence, sourceWord, answer, and completedSentence ALL in that studied language.
- Studying Finnish → Finnish sentences (e.g. "Kuulin ________ eilen.")
- Studying English → English sentences
- Studying Vietnamese → Vietnamese sentences
NEVER wrap a Finnish/other target form in an English sentence frame.
NEVER use English (or the UI language) as the sentence unless that is the language being studied.
Hints may be in any language; practice content must match the studied language.

## CRITICAL UI RULE — never blank inside a word
NEVER produce in-word blanks such as: stem________ or aihee________
ALWAYS use one full-token blank in the studied language.

When the learner must transform a specific word:
- type: "fill_blank" (preferred) or "transformation"
- sourceWord / promptWord = BASE FORM in the studied language (dictionary form), NEVER a translation, NEVER the already-inflected answer.
  Finnish: sourceWord "uutinen" / "uutiset", answer "uutisista" — NOT sourceWord "news" and NOT sourceWord "uutisista".
- answer = COMPLETE target form in the studied language
- sentence = full-word ________ in the studied language (UI shows: … ________ (sourceWord))

For pure transformations without a sentence, use type "transformation" with promptWord + full answer.
For conceptual / rule completion (no specific lexical item), omit sourceWord.

## Quantity
Return EXACTLY maxExercises items (target 20–30). Invent varied contexts for the same rule.
Same full-form answer across different sentences is OK.

## Other
1. Any language/subject.
2. Prefer fill_blank; transformation when there is no sentence; multiple_choice sparingly.
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
6. fill_blank sentence MUST contain exactly one blank as eight underscores: ________
7. No markdown.`;

async function requestExerciseBatch(input: {
  client: OpenAI;
  title: string;
  theoryPlainText: string;
  vocabularyWords: string[];
  maxExercises: number;
  batchIndex: number;
  studyLanguage?: string;
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
          studyLanguage: input.studyLanguage ?? null,
          maxExercises: input.maxExercises,
          batch: input.batchIndex,
          theoryPlainText: input.theoryPlainText,
          vocabularyWords: input.vocabularyWords,
          avoidReusingTheseSentences: (input.avoidSentences ?? []).slice(0, 40),
          reminder:
            "Practice sentence/sourceWord/answer MUST be in studyLanguage (the language being learned). Never use an English sentence frame for a non-English Theory. sourceWord = base form in that language, not a translation and not the declined answer.",
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
  studyLanguage?: string;
}): Promise<TheoryExercise[]> {
  const plainText = theoryDocPlainText(input.doc);
  if (!plainText.trim()) return [];

  const count = Math.min(Math.max(input.count ?? 24, 1), 30);
  const client = getOpenAIClient();
  const vocabularyWords = (input.vocabulary ?? []).slice(0, 60).map((w) => w.word);
  const theoryPlainText = plainText.slice(0, 12_000);
  const studyLanguage = input.studyLanguage?.trim() || undefined;

  const batchArgs = {
    client,
    title: input.theoryTitle,
    theoryPlainText,
    vocabularyWords,
    studyLanguage,
  };

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
    studyLanguage,
  );

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
      studyLanguage,
    );
  }

  if (items.length === 0) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return items;
}
