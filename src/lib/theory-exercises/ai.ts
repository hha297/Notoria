import {
  AI_DEADLINES_MS,
  AI_INPUT_LIMITS,
  AI_OUTPUT_TOKENS,
  afterProviderError,
  clipForAi,
  createAiDeadline,
} from "@/lib/ai/bounds";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import {
  mapAiDraftsToTheoryExercises,
  theoryAiResponseSchema,
  type TheoryAiExerciseDraft,
} from "@/lib/theory-exercises/generate-ai";
import { validateTheoryExercisesSemantically } from "@/lib/theory-exercises/semantic-validate";
import {
  extractTheoryGenerationMaterial,
  maxExampleReuseAllowed,
  targetExampleReuseCount,
} from "@/lib/theory-exercises/theory-material";
import type {
  TheoryExercise,
  TheoryFillBlankExercise,
  TheoryVocabWord,
} from "@/lib/theory-exercises/types";
import type { JSONContent } from "@tiptap/react";
import { ensureSentenceMeanings } from "@/lib/exercises/sentence-meaning";
import type { AppLocale } from "@/i18n/config";

function getOpenAIClient() {
  return requireOpenAiClient({ timeoutMs: 90_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function isDeadlineExceeded(error: unknown): boolean {
  return error instanceof Error && error.message === "AI_DEADLINE_EXCEEDED";
}

const THEORY_EXERCISE_AI_PROMPT = `You generate practice exercises from a learner's free-form Theory notes.

Theory supplies the RULE / learning objective. You invent fresh practice material.

Input fields:
- theoryRules: explanations and rules (primary source of what to teach)
- theoryExamples: illustrative examples from the notes (optional reference only)
- Prefer inventing NEW vocabulary and contexts. Example reuse is optional and must stay rare (aim ~10%, never rely on copying examples).

## Step 0 — Theory focus
Write theoryFocus as 1–2 sentences naming the exact skill/rule from theoryRules.
Do not treat incidental example vocabulary as the learning target.

## Step 1 — Learning target per exercise
For EVERY exercise:
- learningObjective: the rule the learner practices
- targetType: suffix | prefix | word_form | full_word | structure | concept
- hint: guides the task without revealing the answer token
- instruction: short learner-facing task line derived from the Theory rule, preferably in the studied language. If the notes give no clear task wording, use a neutral completion line.
- explanation: explain why THIS answer is required from the base cue in THIS sentence (not a restatement of the topic title alone)
- skillLabel: Theory title when available
- materialSource: "ai" for invented items; "theory" only when the target base word/transformation comes from theoryExamples

## Step 2 — Target selection (critical)
Identify the single token in the practice material that instantiates the Theory rule.
That token MUST be the tested answer. Do not blank a different word’s form while leaving the objective form visible elsewhere.
If several words could be blanked, choose the one that practices the Theory objective — never an arbitrary noun or the first token.

## Step 2b — Form-category lock (critical for inflection Theories)
theoryFocus names the exact grammatical category to practice (a specific case, tense, mood, number, agreement, construction, etc.).
Every tested answer MUST be that SAME category — never a different category that merely fits the sentence.
If a natural sentence would require another category, rewrite the sentence so the Theory category is the one demanded by syntax.
Never label a different-category form as the Theory category in instruction/explanation.

## Step 3 — Complete sentence first (mandatory for fill_blank)
1. Write completedSentence: one FULL grammatical sentence in the studied language that already contains the correct target token in a natural syntactic role.
2. That exact token is answer (complete word form — never an ending alone).
3. Then write sentence by replacing THAT exact token with ________ (eight underscores). Do not invent a different blank answer.
4. sourceWord (when transforming/inflecting) = dictionary BASE form of the blanked token, distinct from answer.
5. Do not force an answer into a slot whose syntax requires a different form; rewrite the sentence instead.
6. Provide enough context before answer time: who/what/situation so the required form is determinable (with sourceWord for inflection tasks). Do not rely on post-answer translation as the only cue.
7. sentenceMeaning = short gloss of completedSentence in uiLanguage (website language), not studyLanguage unless identical.
8. learningObjective, instruction, hint, explanation, acceptedAnswers, and sentenceMeaning must agree with completedSentence and answer — and must name the answer’s real category.

## Language
Detect the studied language from Theory + studyLanguage.
Write sentence, sourceWord, answer, completedSentence in that studied language only.
Never wrap a studied-language form inside an unrelated-language sentence frame.
Hints may use any language; practice content must match the studied language.

## UI constraints
- One full-token blank only. Never place the blank inside a word.
- Never put translation glosses inside the practice sentence.
- Prefer fill_blank; use transformation when there is no sentence frame; multiple_choice sparingly.
- No abstract meta labels; no slash-separated alternate-list labels as answers.
- Variety: different vocabulary, answers, and natural contexts at the implied difficulty.
- Do not copy theoryExamples sentences. If you reuse an example's target base word/transformation, mark materialSource "theory" and keep such items rare.

## Quantity
Return EXACTLY maxExercises valid items whenever the Theory supports it.
Vary vocabulary and contexts; do not stop early after a few items.

## JSON only
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
    "materialSource"?: "theory" | "vocabulary" | "ai",
    "showArrow"?: boolean
  } ]
}
No markdown.`;

async function requestExerciseBatch(input: {
  client: ReturnType<typeof requireOpenAiClient>;
  title: string;
  theoryRules: string;
  theoryExamples: string[];
  maxExampleReuse: number;
  aimExampleReuse: number;
  vocabularyWords: string[];
  maxExercises: number;
  batchIndex: number;
  studyLanguage?: string;
  uiLanguage?: string;
  avoidSentences?: string[];
  signal?: AbortSignal;
}): Promise<{ theoryFocus?: string; exercises: TheoryAiExerciseDraft[] }> {
  let completion;
  try {
    completion = await input.client.chat.completions.create(
      {
        model: "gpt-4o-mini",
        temperature: 0.85,
        max_tokens: AI_OUTPUT_TOKENS.theoryBatch,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: await aiSystemPrompt(THEORY_EXERCISE_AI_PROMPT, {
              responseStyle: true,
            }),
          },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title,
              studyLanguage: input.studyLanguage ?? null,
              uiLanguage: input.uiLanguage ?? "English",
              maxExercises: input.maxExercises,
              batch: input.batchIndex,
              theoryRules: input.theoryRules,
              theoryExamples: input.theoryExamples.slice(0, 40),
              maxExampleDerivedExercises: input.maxExampleReuse,
              aimExampleDerivedExercises: input.aimExampleReuse,
              vocabularyWords: input.vocabularyWords,
              avoidReusingTheseSentences: (input.avoidSentences ?? []).slice(0, 40),
              reminder:
                "Form-category lock: answer must be the Theory category in theoryFocus (never a different case/tense/mood that only fits the sentence). Blank the Theory-category token only. Write completedSentence first, then blank that exact answer. sourceWord = base of the blanked answer. instruction/explanation must name the real category of the answer. Practice fields in studyLanguage; sentenceMeaning in uiLanguage. Prefer fresh vocabulary; example-derived items optional and capped.",
            }),
          },
        ],
      },
      input.signal ? { signal: input.signal } : undefined,
    );
  } catch (error) {
    if (input.signal?.aborted || isDeadlineExceeded(error)) {
      throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
    }
    throw afterProviderError(error);
  }

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const parsed = theoryAiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AI_INVALID_RESPONSE");
  }
  return {
    theoryFocus: parsed.data.theoryFocus,
    exercises: parsed.data.exercises,
  };
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
  const material = extractTheoryGenerationMaterial(input.doc);
  if (!material.rulesText.trim() && material.exampleTexts.length === 0) {
    return [];
  }

  /** Requested set size (UI asks ~24). Never aim below the practice minimum. */
  const MIN_PRACTICE_SET = 15;
  const count = Math.min(Math.max(input.count ?? 24, MIN_PRACTICE_SET), 30);
  const deadline = createAiDeadline(AI_DEADLINES_MS.theoryGenerate);
  const exampleLexemes = material.exampleLexemes;
  const mapOpts = { studyLanguage: undefined as string | undefined, exampleLexemes };

  // Map a larger pool than the final count so reuse + semantic filters still leave enough.
  const mapDrafts = (drafts: TheoryAiExerciseDraft[], maxItems: number) =>
    mapAiDraftsToTheoryExercises(
      input.theoryId,
      drafts,
      input.theoryTitle,
      maxItems,
      mapOpts,
    );

  try {
    const client = getOpenAIClient();
    const vocabularyWords = (input.vocabulary ?? [])
      .slice(0, 60)
      .map((w) => clipForAi(w.word, AI_INPUT_LIMITS.word))
      .filter((word) => word.length > 0);
    const theoryRules = clipForAi(material.rulesText, AI_INPUT_LIMITS.theory);
    const theoryExamples = material.exampleTexts
      .slice(0, 40)
      .map((text) => clipForAi(text, 240))
      .filter(Boolean);
    const title = clipForAi(input.theoryTitle, AI_INPUT_LIMITS.title);
    const studyLanguage = input.studyLanguage?.trim() || undefined;
    mapOpts.studyLanguage = studyLanguage;
    const uiLanguage = input.uiLanguage?.trim() || "English";
    const maxExampleReuse = maxExampleReuseAllowed(count);
    const aimExampleReuse = targetExampleReuseCount(count);

    const batchArgs = {
      client,
      title,
      theoryRules,
      theoryExamples,
      maxExampleReuse,
      aimExampleReuse,
      vocabularyWords,
      studyLanguage,
      uiLanguage,
      signal: deadline.signal,
    };

    // Over-request so structural + semantic filters still leave a full practice set.
    const first = Math.ceil(count * 0.75) + 4;
    const second = Math.ceil(count * 0.75) + 4;
    const poolCap = Math.min(60, count * 2);
    const settled = await Promise.allSettled([
      requestExerciseBatch({ ...batchArgs, maxExercises: first, batchIndex: 1 }),
      requestExerciseBatch({ ...batchArgs, maxExercises: second, batchIndex: 2 }),
    ]);

    const rejections = settled
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason);
    const deadlineHit =
      deadline.expired() || rejections.some(isDeadlineExceeded);

    let drafts: TheoryAiExerciseDraft[] = [];
    let theoryFocus: string | undefined;
    for (const result of settled) {
      if (result.status === "fulfilled") {
        drafts = [...drafts, ...result.value.exercises];
        theoryFocus = theoryFocus ?? result.value.theoryFocus?.trim();
      }
    }

    const applySemantic = async (candidates: TheoryExercise[]) => {
      if (candidates.length === 0 || deadline.expired()) return candidates;
      try {
        deadline.throwIfExpired();
        const accepted = await validateTheoryExercisesSemantically({
          items: candidates,
          theoryTitle: title,
          theoryFocus,
          theoryRules,
          studyLanguage,
          signal: deadline.signal,
        });
        return accepted.slice(0, count);
      } catch (error) {
        if (isDeadlineExceeded(error) || deadline.expired()) {
          return candidates.slice(0, count);
        }
        throw error;
      }
    };

    let items = await applySemantic(mapDrafts(drafts, poolCap));

    // Bounded refill until we hit the practice minimum (or the requested count).
    let refillAttempts = 0;
    const needAtLeast = Math.min(count, MIN_PRACTICE_SET);
    while (items.length < needAtLeast && !deadlineHit && refillAttempts < 4) {
      refillAttempts += 1;
      const avoid = [
        ...drafts.map((d) => d.sentence).filter((s): s is string => Boolean(s)),
        ...drafts
          .map((d) => d.completedSentence)
          .filter((s): s is string => Boolean(s)),
        ...items
          .filter((item): item is TheoryFillBlankExercise => item.type === "fill_blank")
          .map((item) => item.completedSentence ?? item.sentence),
      ];
      const need = Math.max(needAtLeast - items.length + 6, 12);
      try {
        deadline.throwIfExpired();
        const refill = await requestExerciseBatch({
          ...batchArgs,
          maxExercises: Math.min(need, 20),
          batchIndex: 2 + refillAttempts,
          avoidSentences: avoid,
        });
        drafts = [...drafts, ...refill.exercises];
        theoryFocus = theoryFocus ?? refill.theoryFocus?.trim();
        items = await applySemantic(mapDrafts(drafts, poolCap));
      } catch (error) {
        if (isDeadlineExceeded(error) || deadline.expired()) {
          break;
        }
        if (items.length === 0) {
          throw error instanceof Error && error.message === "AI_INVALID_RESPONSE"
            ? error
            : afterProviderError(error);
        }
        break;
      }
    }

    if (items.length === 0) {
      const deadlineErr = rejections.find(isDeadlineExceeded);
      if (deadlineErr || deadline.expired()) {
        throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
      }
      const hard = rejections.find(
        (error) =>
          !(error instanceof Error && error.message === "AI_INVALID_RESPONSE"),
      );
      if (hard) throw afterProviderError(hard);
      throw new Error("AI_INVALID_RESPONSE");
    }

    // Honest partial sets: return only validated items (may be < requested count).
    if (deadline.expired()) {
      return items;
    }

    const uiLocale = resolveUiLocaleFromLanguageName(uiLanguage);
    return ensureSentenceMeanings(items, {
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
  } finally {
    deadline.clear();
  }
}

function resolveUiLocaleFromLanguageName(languageName: string): AppLocale {
  const normalized = languageName.trim().toLowerCase();
  if (
    normalized.startsWith("ar") ||
    normalized.includes("arabic") ||
    normalized.includes("عربي")
  ) {
    return "ar";
  }
  if (
    normalized.startsWith("be") ||
    normalized.includes("belarusian") ||
    normalized.includes("belarusan") ||
    normalized.includes("беларуск")
  ) {
    return "be";
  }
  if (
    normalized.startsWith("bg") ||
    normalized.includes("bulgarian") ||
    normalized.includes("българ")
  ) {
    return "bg";
  }
  if (
    normalized.startsWith("bs") ||
    normalized.includes("bosnian") ||
    normalized.includes("bosanski")
  ) {
    return "bs";
  }
  if (
    normalized.startsWith("cs") ||
    normalized.includes("czech") ||
    normalized.includes("čeština") ||
    normalized.includes("cestina")
  ) {
    return "cs";
  }
  if (
    normalized.startsWith("da") ||
    normalized.includes("danish") ||
    normalized.includes("dansk")
  ) {
    return "da";
  }
  if (normalized.startsWith("de") || normalized.includes("german") || normalized.includes("deutsch")) {
    return "de";
  }
  if (
    normalized.startsWith("el") ||
    normalized.includes("greek") ||
    normalized.includes("ελλην")
  ) {
    return "el";
  }
  if (normalized.startsWith("fi")) return "fi";
  if (
    normalized.startsWith("hi") ||
    normalized.includes("hindi") ||
    normalized.includes("हिन्दी") ||
    normalized.includes("हिंदी")
  ) {
    return "hi";
  }
  if (
    normalized.startsWith("hu") ||
    normalized.includes("hungarian") ||
    normalized.includes("magyar")
  ) {
    return "hu";
  }
  if (
    normalized.startsWith("hy") ||
    normalized.includes("armenian") ||
    normalized.includes("հայերեն") ||
    normalized.includes("hayeren")
  ) {
    return "hy";
  }
  if (
    normalized === "id" ||
    normalized.startsWith("id ") ||
    normalized.includes("indonesian") ||
    normalized.includes("bahasa indonesia")
  ) {
    return "id";
  }
  if (
    normalized.startsWith("es") ||
    normalized.includes("spanish") ||
    normalized.includes("español") ||
    normalized.includes("espanol")
  ) {
    return "es";
  }
  if (
    normalized.startsWith("fr") ||
    normalized.includes("french") ||
    normalized.includes("français") ||
    normalized.includes("francais")
  ) {
    return "fr";
  }
  if (
    normalized.startsWith("it") ||
    normalized.includes("italian") ||
    normalized.includes("italiano")
  ) {
    return "it";
  }
  if (
    normalized.startsWith("ja") ||
    normalized.includes("japanese") ||
    normalized.includes("日本語")
  ) {
    return "ja";
  }
  if (
    normalized.startsWith("ko") ||
    normalized.includes("korean") ||
    normalized.includes("한국")
  ) {
    return "ko";
  }
  if (
    normalized.startsWith("nl") ||
    normalized.includes("dutch") ||
    normalized.includes("nederlands")
  ) {
    return "nl";
  }
  if (
    normalized.startsWith("no") ||
    normalized.includes("norwegian") ||
    normalized.includes("norsk") ||
    normalized.includes("bokmål") ||
    normalized.includes("bokmal")
  ) {
    return "no";
  }
  if (
    normalized.startsWith("pl") ||
    normalized.includes("polish") ||
    normalized.includes("polski")
  ) {
    return "pl";
  }
  if (
    normalized.startsWith("pt") ||
    normalized.includes("portuguese") ||
    normalized.includes("português") ||
    normalized.includes("portugues")
  ) {
    return "pt";
  }
  if (
    normalized.startsWith("ro") ||
    normalized.includes("romanian") ||
    normalized.includes("română") ||
    normalized.includes("romana")
  ) {
    return "ro";
  }
  if (
    normalized.startsWith("ru") ||
    normalized.includes("russian") ||
    normalized.includes("русский") ||
    normalized.includes("russkiy")
  ) {
    return "ru";
  }
  if (
    normalized.startsWith("sq") ||
    normalized.includes("albanian") ||
    normalized.includes("shqip")
  ) {
    return "sq";
  }
  if (normalized.startsWith("sv") || normalized.includes("swedish")) return "sv";
  if (
    normalized.startsWith("th") ||
    normalized.includes("thai") ||
    normalized.includes("ไทย")
  ) {
    return "th";
  }
  if (
    normalized.startsWith("tr") ||
    normalized.includes("turkish") ||
    normalized.includes("türk") ||
    normalized.includes("turk")
  ) {
    return "tr";
  }
  if (
    normalized.startsWith("uk") ||
    normalized.includes("ukrainian") ||
    normalized.includes("україн")
  ) {
    return "uk";
  }
  if (normalized.startsWith("vi") || normalized.includes("vietnam")) return "vi";
  if (
    normalized.startsWith("zh") ||
    normalized.includes("chinese") ||
    normalized.includes("中文") ||
    normalized.includes("汉语") ||
    normalized.includes("漢語")
  ) {
    return "zh";
  }
  return "en";
}

export { glossSentenceMeaning as glossTheorySentenceMeaning } from "@/lib/exercises/sentence-meaning";
