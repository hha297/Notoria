import OpenAI from "openai";
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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 45_000 });
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
  options?: { simplifyRetry?: boolean },
): Promise<ContextualAiExercise[]> {
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
    regenerateReason: options?.simplifyRetry ? SURFACE_RETRY_REASON : undefined,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature:
      input.difficulty === "easy" ? 0.4 : options?.simplifyRetry ? 0.35 : 0.7,
    max_tokens: 2500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
    ],
  });

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

  const valid = await requestExercises(client, input, input.words);
  const acceptedIds = new Set(valid.map((exercise) => exercise.wordId));
  const missing = input.words.filter((word) => !acceptedIds.has(word.id));

  if (missing.length > 0) {
    const retry = await requestExercises(client, input, missing, {
      simplifyRetry: true,
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
}
