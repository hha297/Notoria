import type OpenAI from "openai";
import {
  AI_DEADLINES_MS,
  AI_OUTPUT_TOKENS,
  createAiDeadline,
  type AiDeadline,
} from "@/lib/ai/bounds";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { appendAdditionalInstructions } from "@/lib/exercises/additional-instructions";
import { getLanguageByCode } from "@/lib/languages";
import {
  CONTEXTUAL_MC_GENERATOR_PROMPT,
  CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT,
  contextualAiUserPayload,
} from "@/lib/exercises/contextual-ai-prompt";
import {
  contextualAiResultSchema,
  type ContextualAiDraft,
  type ContextualAiExercise,
  type ContextualAiRequest,
  type ContextualAiWordInput,
  type ContextualMcDraft,
  type ContextualMcExercise,
  type ContextualTypeAnswerDraft,
  type ContextualTypeAnswerExercise,
} from "@/lib/exercises/contextual-ai-types";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";
import { promptMatchesDifficulty } from "@/lib/exercises/prompt-matches-difficulty";
import { resolveValidBlankMeaningHint } from "@/lib/exercises/blank-hint";
import { resolveProgressiveHints } from "@/lib/exercises/progressive-hints";
import {
  optionLooksLikeLemma,
  resolveContextualFromCompleteSentence,
} from "@/lib/exercises/lexical-surface";
import {
  normalizeMeaningKey,
  pickDistractors,
  shuffleArray,
} from "@/lib/exercises/utils";

export const CONTEXTUAL_MC_OPTION_COUNT = 4;

const SURFACE_RETRY_REASON =
  "Previous drafts were rejected or missing. Keep each assigned wordId as the target (do not swap words). Write a COMPLETE grammatical sentence that already contains the correctly inflected target token — no blank and no underscore placeholder. Return that exact in-sentence token as answerForm/answer/correctOption. Do not inflect again after writing the sentence. Use a distinct everyday context per word.";

function getOpenAIClient() {
  return requireOpenAiClient({ timeoutMs: 45_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function languageHint(code: string | null | undefined) {
  if (!code) return null;
  return getLanguageByCode(code)?.name ?? code;
}

function uiLanguageName(locale: string | undefined) {
  if (locale === "fi") return "Finnish";
  if (locale === "sv") return "Swedish";
  if (locale === "vi") return "Vietnamese";
  return "English";
}

function normalizeOption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function optionEquals(a: string, b: string) {
  return normalizeMeaningKey(a) === normalizeMeaningKey(b);
}

/**
 * Build exactly 4 unique options using AI output + learner distractorPool.
 * The clickable correct option is the contextual surface form.
 */
function buildExactMcOptions(
  draftOptions: string[],
  correctOption: string,
  lemma: string,
  distractorPool: string[],
): string[] | null {
  const unique: string[] = [];
  const pushUnique = (value: string) => {
    const normalized = normalizeOption(value);
    if (!normalized) return;
    if (unique.some((option) => optionEquals(option, normalized))) return;
    unique.push(normalized);
  };

  pushUnique(correctOption);
  for (const option of draftOptions.map(normalizeOption).filter(Boolean)) {
    if (
      optionLooksLikeLemma(option, lemma) &&
      !optionEquals(option, correctOption)
    ) {
      continue;
    }
    pushUnique(option);
  }

  const pool = distractorPool.map(normalizeOption).filter(Boolean);
  const needed = CONTEXTUAL_MC_OPTION_COUNT - unique.length;
  if (needed > 0) {
    for (const distractor of pickDistractors(
      pool,
      correctOption,
      needed + pool.length,
      (a, b) => optionEquals(a, b) || optionLooksLikeLemma(a, lemma),
    )) {
      pushUnique(distractor);
      if (unique.length >= CONTEXTUAL_MC_OPTION_COUNT) break;
    }
  }

  if (unique.length < CONTEXTUAL_MC_OPTION_COUNT) return null;

  const withCorrect = unique.some((option) =>
    optionEquals(option, correctOption),
  )
    ? unique.slice(0, CONTEXTUAL_MC_OPTION_COUNT)
    : [correctOption, ...unique].slice(0, CONTEXTUAL_MC_OPTION_COUNT);

  if (withCorrect.length !== CONTEXTUAL_MC_OPTION_COUNT) return null;
  if (!withCorrect.some((option) => optionEquals(option, correctOption))) {
    return null;
  }

  return shuffleArray(withCorrect);
}

function completeSentenceSource(draft: {
  completeSentence?: string | null;
  prompt?: string | null;
}) {
  const complete = draft.completeSentence?.trim() ?? "";
  if (complete) return complete;
  return draft.prompt?.trim() ?? "";
}

function validateMc(
  draft: ContextualMcDraft,
  word: ContextualAiWordInput,
  difficulty: ExerciseDifficulty,
): ContextualMcExercise | null {
  const lemma = normalizeOption(word.word);
  const completeSentence = completeSentenceSource(draft);
  const proposed = normalizeOption(
    draft.answerForm || draft.correctOption || "",
  );

  if (!completeSentence || !lemma) return null;
  if (!promptMatchesDifficulty(completeSentence, difficulty)) return null;

  const resolved = resolveContextualFromCompleteSentence({
    completeSentence,
    lemma,
    proposed: proposed || undefined,
  });
  if (!resolved) return null;
  const { prompt, answerForm } = resolved;

  const meaningHint = resolveValidBlankMeaningHint({
    meaning: word.meaning,
    answer: answerForm,
    baseWord: lemma,
  });
  if (!meaningHint) return null;

  const correctOption = answerForm;
  const options = buildExactMcOptions(
    draft.options,
    correctOption,
    lemma,
    word.distractorPool ?? [],
  );
  if (!options) return null;

  return {
    wordId: word.id,
    type: "multiple-choice",
    prompt,
    options,
    correctOption,
    baseWord: lemma,
    answerForm,
    sentenceMeaning: draft.sentenceMeaning,
    hints: resolveProgressiveHints({
      raw: draft.hints,
      answers: [answerForm, lemma],
      grounding: word.meaning,
      difficulty,
      visibleMeaning: word.meaning,
    }),
  };
}

function validateTypeAnswer(
  draft: ContextualTypeAnswerDraft,
  word: ContextualAiWordInput,
  difficulty: ExerciseDifficulty,
): ContextualTypeAnswerExercise | null {
  const completeSentence = completeSentenceSource(draft);
  const proposed = normalizeOption(draft.answer ?? "");
  if (!completeSentence) return null;
  if (!promptMatchesDifficulty(completeSentence, difficulty)) return null;

  const resolved = resolveContextualFromCompleteSentence({
    completeSentence,
    lemma: word.word,
    proposed: proposed || undefined,
  });
  if (!resolved) return null;
  const { prompt, answerForm: answer } = resolved;

  const meaningHint = resolveValidBlankMeaningHint({
    meaning: word.meaning,
    answer,
    baseWord: word.word,
  });
  if (!meaningHint) return null;

  return {
    wordId: word.id,
    type: "type-answer",
    prompt,
    answer,
    sentenceMeaning: draft.sentenceMeaning,
    hints: resolveProgressiveHints({
      raw: draft.hints,
      answers: [answer, word.word],
      grounding: word.meaning,
      difficulty,
      mode: "spelling-progressive",
      visibleMeaning: meaningHint,
      spellingAnswer: answer,
      lemma: word.word,
    }),
  };
}

function selectValid(
  drafts: ContextualAiDraft[],
  words: ContextualAiWordInput[],
  exerciseType: ContextualAiRequest["exerciseType"],
  difficulty: ExerciseDifficulty,
): ContextualAiExercise[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  const used = new Set<string>();
  const valid: ContextualAiExercise[] = [];

  for (const draft of drafts) {
    if (
      draft.type === "multiple-choice" &&
      exerciseType !== "multiple-choice"
    ) {
      continue;
    }
    if (draft.type === "type-answer" && exerciseType !== "type-answer") {
      continue;
    }
    const word = byId.get(draft.wordId);
    if (!word || used.has(word.id)) continue;
    const next =
      draft.type === "multiple-choice"
        ? validateMc(draft, word, difficulty)
        : validateTypeAnswer(draft, word, difficulty);
    if (!next) continue;
    used.add(word.id);
    valid.push(next);
  }

  return valid;
}

export function selectValidContextualExercises(
  drafts: ContextualAiDraft[],
  words: ContextualAiWordInput[],
  exerciseType: ContextualAiRequest["exerciseType"],
  difficulty: ExerciseDifficulty,
): ContextualAiExercise[] {
  return selectValid(drafts, words, exerciseType, difficulty);
}

async function requestExercises(
  client: OpenAI,
  input: ContextualAiRequest,
  words: ContextualAiWordInput[],
  options?: { simplifyRetry?: boolean; deadline?: AiDeadline },
): Promise<ContextualAiExercise[]> {
  options?.deadline?.throwIfExpired();

  const system =
    input.exerciseType === "multiple-choice"
      ? CONTEXTUAL_MC_GENERATOR_PROMPT
      : CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT;

  const payload = contextualAiUserPayload({
    exerciseType: input.exerciseType,
    languageHint: languageHint(input.language),
    languageCode: input.language ?? null,
    difficulty: input.difficulty,
    uiLanguage: uiLanguageName(input.uiLocale),
    words,
    additionalInstructions: input.additionalInstructions,
    regenerateReason: options?.simplifyRetry ? SURFACE_RETRY_REASON : undefined,
  });

  const completion = await client.chat.completions.create(
    {
      model: "gpt-5.6-terra",
      reasoning_effort: "none",
      temperature:
        input.difficulty === "easy" ? 0.4 : options?.simplifyRetry ? 0.35 : 0.7,
      max_completion_tokens: AI_OUTPUT_TOKENS.exerciseContextual,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: appendAdditionalInstructions(
            await aiSystemPrompt(system, { responseStyle: true }),
            input.additionalInstructions,
          ),
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
    },
    options?.deadline ? { signal: options.deadline.signal } : undefined,
  );

  const parsed = contextualAiResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );
  if (!parsed.success) {
    return [];
  }

  return selectValid(
    parsed.data.exercises,
    words,
    input.exerciseType,
    input.difficulty,
  );
}

export async function generateContextualExercises(
  input: ContextualAiRequest,
): Promise<ContextualAiExercise[]> {
  const client = getOpenAIClient();
  const deadline = createAiDeadline(AI_DEADLINES_MS.default);

  try {
    const valid = await requestExercises(client, input, input.words, {
      deadline,
    });
    const acceptedIds = new Set(valid.map((exercise) => exercise.wordId));
    const missing = input.words.filter((word) => !acceptedIds.has(word.id));

    if (missing.length > 0 && !deadline.expired()) {
      const retry = await requestExercises(client, input, missing, {
        simplifyRetry: true,
        deadline,
      });
      for (const exercise of retry) {
        if (!acceptedIds.has(exercise.wordId)) {
          valid.push(exercise);
          acceptedIds.add(exercise.wordId);
        }
      }
    }

    if (valid.length === 0) {
      throw new Error("AI_INVALID_RESPONSE");
    }
    return valid;
  } finally {
    deadline.clear();
  }
}
