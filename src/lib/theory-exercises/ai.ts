import OpenAI from "openai";
import {
  mapAiDraftsToTheoryExercises,
  theoryAiResponseSchema,
  type TheoryAiExerciseDraft,
} from "@/lib/theory-exercises/generate-ai";
import type {
  TheoryExercise,
  TheoryFillBlankExercise,
  TheoryVocabWord,
} from "@/lib/theory-exercises/types";
import { theoryDocPlainText } from "@/lib/theory/content";
import type { JSONContent } from "@tiptap/react";
import { ensureSentenceMeanings } from "@/lib/exercises/sentence-meaning";
import type { AppLocale } from "@/i18n/config";

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
- instruction: short learner-facing task line derived from the Theory rule (what they should do). Prefer the studied language of the Theory. Example: if Theory teaches Finnish plural partitive of adjectives, instruction might be "Kirjoita adjektiivi monikon partitiivissa." Do NOT invent topics that Theory does not support. If Theory has no clear task wording, use a neutral line like "Complete the exercise."
- skillLabel: Theory title when available

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

## CRITICAL — sentenceMeaning (UI language)
For EVERY fill_blank exercise, ALWAYS include sentenceMeaning:
- A short natural translation / gloss of the COMPLETE correct sentence (completedSentence).
- Write sentenceMeaning in uiLanguage (the website interface language), NOT in studyLanguage (unless they are the same).
- Examples: uiLanguage Finnish → Finnish gloss; uiLanguage English → English gloss; uiLanguage Vietnamese → Vietnamese gloss.
- Do NOT put sentenceMeaning inside the practice sentence. It is a separate field for post-answer UI.

## CRITICAL UI RULE — never blank inside a word
NEVER produce in-word blanks such as: stem________ or aihee________
ALWAYS use one full-token blank in the studied language.

When the learner must transform a specific word:
- type: "fill_blank" (preferred) or "transformation"
- sourceWord / promptWord = BASE FORM in the studied language (dictionary form), NEVER a translation, NEVER the already-inflected answer.
  Finnish: sourceWord "uutinen" / "uutiset", answer "uutisista" — NOT sourceWord "news" and NOT sourceWord "uutisista".
- answer = COMPLETE target form in the studied language
- sentence = full-word ________ in the studied language (UI shows: … ________ (sourceWord))

For word-form / inflection / case / conjugation practice (the usual Theory case):
ALWAYS set sourceWord to the base form shown in parentheses. Example UI: Meillä on ________ (koira).
Only omit sourceWord for pure concept/rule completion with no lexical item to transform.

## CRITICAL — contextual, theory-aligned practice sentences
Do NOT optimize for grammatical correctness alone.
Optimize for: meaningful context + exact theory application + natural language a teacher would use.

Every fill_blank / transformation sentence MUST pass:
"Would a teacher consider this a useful example for THIS exact grammar point?"

Rules:
1. Match the exact Theory focus (e.g. Adjektiivien komparatiivi → comparative adjective forms are required).
2. Make the target grammar NECESSARY from context — not optional.
   Bad comparative: "Tämä päivä on ________." (vague; positive form also works)
   Good comparative: "Tänään on paljon ________ kuin eilen." / "Helsinki on ________ kuin Turku."
3. Provide enough context: who/what, comparison or situation, why this form is needed.
4. Prefer natural everyday sentences over artificial AI-sounding ones.
   Bad: "Tämä talo on ________ kuin toinen talo."
   Good: "Meidän uusi asunto on paljon ________ kuin vanha asunto."
5. Make the answer inferable from context, but not trivially spoon-fed with numbers unless Theory needs that.
6. Match difficulty to Theory level — context should clarify, not overcomplicate.
7. If vocabularyWords are provided, use them with the intended meaning when relevant.
8. Reject incomplete or context-free frames. Prefer regenerating a richer sentence.

## Quantity
Return EXACTLY maxExercises items (target 20–30). Invent varied contexts for the same rule.
Same full-form answer across different sentences is OK.

## Other
1. Any language/subject.
2. Prefer fill_blank; transformation when there is no sentence; multiple_choice sparingly.
3. No abstract meta questions; no "/" alternate-list labels as answers.
4. skillLabel = Theory title when available.
5. ALWAYS include instruction (see Step 1). Never leave the learner without task context.
6. JSON only:
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
    "sentenceMeaning"?: string,
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
7. No markdown.
8. Optional showArrow: false for prompt-line style (cue + blank) instead of cue → blank.
9. fill_blank MUST include sentenceMeaning in uiLanguage.
10. Prefer putting sentence-final punctuation immediately after the blank (e.g. "… ________.") — do not leave a lone period as a separate awkward fragment.`;

async function requestExerciseBatch(input: {
  client: OpenAI;
  title: string;
  theoryPlainText: string;
  vocabularyWords: string[];
  maxExercises: number;
  batchIndex: number;
  studyLanguage?: string;
  uiLanguage?: string;
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
          uiLanguage: input.uiLanguage ?? "English",
          maxExercises: input.maxExercises,
          batch: input.batchIndex,
          theoryPlainText: input.theoryPlainText,
          vocabularyWords: input.vocabularyWords,
          avoidReusingTheseSentences: (input.avoidSentences ?? []).slice(0, 40),
          reminder:
            "Practice sentence/answer/sourceWord MUST be in studyLanguage. ALWAYS include sourceWord (base form) for form practice so the UI can show: ________ (sourceWord). Never omit it for case/inflection drills. sourceWord must differ from answer. For every fill_blank include sentenceMeaning in uiLanguage (website language), not studyLanguage. Sentences must make the Theory grammar point necessary via natural context (e.g. comparatives need kuin/comparison; avoid vague frames like 'Tämä päivä on ________.').",
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
  /** Website UI language name for sentenceMeaning (e.g. "Finnish", "English"). */
  uiLanguage?: string;
}): Promise<TheoryExercise[]> {
  const plainText = theoryDocPlainText(input.doc);
  if (!plainText.trim()) return [];

  const count = Math.min(Math.max(input.count ?? 24, 1), 30);
  const client = getOpenAIClient();
  const vocabularyWords = (input.vocabulary ?? []).slice(0, 60).map((w) => w.word);
  const theoryPlainText = plainText.slice(0, 12_000);
  const studyLanguage = input.studyLanguage?.trim() || undefined;
  const uiLanguage = input.uiLanguage?.trim() || "English";

  const batchArgs = {
    client,
    title: input.theoryTitle,
    theoryPlainText,
    vocabularyWords,
    studyLanguage,
    uiLanguage,
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

  const uiLocale = resolveUiLocaleFromLanguageName(uiLanguage);
  const ensured = await ensureSentenceMeanings(items, {
    uiLocale,
    getSentence: (item) => {
      if (item.type !== "fill_blank") return "";
      return (
        item.completedSentence?.trim() ||
        `${item.prefix ?? ""}${item.answer}${item.suffix ?? ""}`.replace(/\s+/g, " ").trim()
      );
    },
    getMeaning: (item) =>
      item.type === "fill_blank" ? item.sentenceMeaning : undefined,
    setMeaning: (item, sentenceMeaning) => {
      if (item.type !== "fill_blank") return item;
      return { ...item, sentenceMeaning } satisfies TheoryFillBlankExercise;
    },
  });

  return ensured;
}

function resolveUiLocaleFromLanguageName(languageName: string): AppLocale {
  const normalized = languageName.trim().toLowerCase();
  if (normalized.startsWith("fi")) return "fi";
  if (normalized.startsWith("vi") || normalized.includes("vietnam")) return "vi";
  return "en";
}

export { glossSentenceMeaning as glossTheorySentenceMeaning } from "@/lib/exercises/sentence-meaning";
