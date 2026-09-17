import OpenAI from "openai";
import { getLanguageByCode } from "@/lib/languages";
import {
  CONTEXTUAL_MC_GENERATOR_PROMPT,
  CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT,
  contextualAiUserPayload,
} from "@/lib/exercises/contextual-ai-prompt";
import {
  contextualAiResultSchema,
  CONTEXTUAL_BLANK,
  type ContextualAiExercise,
  type ContextualAiRequest,
  type ContextualAiWordInput,
  type ContextualMcExercise,
  type ContextualTypeAnswerExercise,
} from "@/lib/exercises/contextual-ai-types";
import type { ExerciseDifficulty } from "@/lib/exercises/difficulty";
import { promptMatchesDifficulty } from "@/lib/exercises/prompt-matches-difficulty";
import { resolveValidBlankMeaningHint } from "@/lib/exercises/blank-hint";
import {
  answersMatchAny,
  normalizeMeaningKey,
  pickDistractors,
  shuffleArray,
} from "@/lib/exercises/utils";

export const CONTEXTUAL_MC_OPTION_COUNT = 4;

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
  if (locale === "vi") return "Vietnamese";
  return "English";
}

function normalizeOption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isRelatedTargetForm(answer: string, word: string) {
  const a = answer.trim().toLowerCase();
  const w = word.trim().toLowerCase();
  if (!a || !w) return false;
  if (a === w) return true;
  if (a.includes(w) || w.includes(a)) return true;
  return answersMatchAny(answer, [word]);
}

function optionEquals(a: string, b: string) {
  return normalizeMeaningKey(a) === normalizeMeaningKey(b);
}

/**
 * Build exactly 4 unique options using AI output + learner distractorPool.
 * Returns null when the learner pool cannot supply 4 distinct options.
 */
function buildExactMcOptions(
  draftOptions: string[],
  correctOption: string,
  answerForm: string,
  distractorPool: string[],
): string[] | null {
  const filtered = draftOptions
    .map(normalizeOption)
    .filter(Boolean)
    .filter(
      (option) =>
        !optionEquals(option, answerForm) || optionEquals(option, correctOption),
    );

  const unique: string[] = [];
  const pushUnique = (value: string) => {
    const normalized = normalizeOption(value);
    if (!normalized) return;
    if (unique.some((option) => optionEquals(option, normalized))) return;
    unique.push(normalized);
  };

  pushUnique(correctOption);
  for (const option of filtered) pushUnique(option);

  const pool = distractorPool.map(normalizeOption).filter(Boolean);
  const needed = CONTEXTUAL_MC_OPTION_COUNT - unique.length;
  if (needed > 0) {
    for (const distractor of pickDistractors(
      pool,
      correctOption,
      needed + pool.length,
      optionEquals,
    )) {
      pushUnique(distractor);
      if (unique.length >= CONTEXTUAL_MC_OPTION_COUNT) break;
    }
  }

  if (unique.length < CONTEXTUAL_MC_OPTION_COUNT) return null;

  const withCorrect = unique.some((option) => optionEquals(option, correctOption))
    ? unique.slice(0, CONTEXTUAL_MC_OPTION_COUNT)
    : [correctOption, ...unique].slice(0, CONTEXTUAL_MC_OPTION_COUNT);

  if (withCorrect.length !== CONTEXTUAL_MC_OPTION_COUNT) return null;
  if (!withCorrect.some((option) => optionEquals(option, correctOption))) {
    return null;
  }

  return shuffleArray(withCorrect);
}

function validateMc(
  draft: ContextualMcExercise,
  word: ContextualAiWordInput,
  difficulty: ExerciseDifficulty,
): ContextualMcExercise | null {
  const baseWord = normalizeOption(draft.baseWord || word.word);
  // Require an explicit blank surface form from the model (do not fall back to base).
  const rawAnswerForm = normalizeOption(draft.answerForm ?? "");
  const prompt = draft.prompt.trim();

  if (!prompt || !baseWord || !rawAnswerForm) return null;
  if (!prompt.includes(CONTEXTUAL_BLANK) && !prompt.includes("________")) {
    return null;
  }
  if (!isRelatedTargetForm(baseWord, word.word)) return null;
  if (!isRelatedTargetForm(rawAnswerForm, word.word)) return null;
  if (!promptMatchesDifficulty(prompt, difficulty)) return null;

  const meaningHint = resolveValidBlankMeaningHint({
    meaning: word.meaning,
    answer: rawAnswerForm,
    baseWord,
  });
  if (!meaningHint) return null;

  const correctOption = baseWord;
  const answerForm = applyAnswerFormCasingForBlank(prompt, rawAnswerForm);
  const options = buildExactMcOptions(
    draft.options,
    correctOption,
    answerForm,
    word.distractorPool ?? [],
  );
  if (!options) return null;

  return {
    wordId: word.id,
    type: "multiple-choice",
    prompt,
    options,
    correctOption,
    baseWord,
    answerForm,
    sentenceMeaning: draft.sentenceMeaning,
  };
}

function applyAnswerFormCasingForBlank(prompt: string, answerForm: string): string {
  const form = answerForm.trim();
  if (!form) return form;
  const blankIndex = prompt.indexOf(CONTEXTUAL_BLANK);
  const idx = blankIndex >= 0 ? blankIndex : prompt.indexOf("________");
  if (idx < 0) return form;
  const prefix = prompt.slice(0, idx);
  const atSentenceStart =
    prefix.trim().length === 0 || /[.!?…]\s*$/u.test(prefix) || /\n\s*$/u.test(prefix);
  if (atSentenceStart) {
    return form.charAt(0).toLocaleUpperCase() + form.slice(1);
  }
  return form.charAt(0).toLocaleLowerCase() + form.slice(1);
}

function validateTypeAnswer(
  draft: ContextualTypeAnswerExercise,
  word: ContextualAiWordInput,
  difficulty: ExerciseDifficulty,
): ContextualTypeAnswerExercise | null {
  const rawAnswer = normalizeOption(draft.answer);
  const prompt = draft.prompt.trim();
  if (!prompt || !rawAnswer) return null;
  if (!prompt.includes(CONTEXTUAL_BLANK) && !prompt.includes("________")) {
    return null;
  }
  if (!isRelatedTargetForm(rawAnswer, word.word)) return null;
  if (!promptMatchesDifficulty(prompt, difficulty)) return null;

  const meaningHint = resolveValidBlankMeaningHint({
    meaning: word.meaning,
    answer: rawAnswer,
    baseWord: word.word,
  });
  if (!meaningHint) return null;

  const answer = applyAnswerFormCasingForBlank(prompt, rawAnswer);
  return {
    wordId: word.id,
    type: "type-answer",
    prompt,
    answer,
    sentenceMeaning: draft.sentenceMeaning,
  };
}

function selectValid(
  drafts: ContextualAiExercise[],
  words: ContextualAiWordInput[],
  exerciseType: ContextualAiRequest["exerciseType"],
  difficulty: ExerciseDifficulty,
): ContextualAiExercise[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  const used = new Set<string>();
  const valid: ContextualAiExercise[] = [];

  for (const draft of drafts) {
    if (draft.type === "multiple-choice" && exerciseType !== "multiple-choice") {
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
  });

  if (options?.simplifyRetry) {
    Object.assign(payload, {
      regenerateReason:
        "Previous drafts were rejected or missing. Keep each assigned wordId as the target (do not swap words). Rewrite with simpler sentence structure for the selected difficulty, and use a distinct everyday context per word.",
    });
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: input.difficulty === "easy" ? 0.4 : options?.simplifyRetry ? 0.35 : 0.7,
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

  let valid = await requestExercises(client, input, input.words);
  const acceptedIds = new Set(valid.map((exercise) => exercise.wordId));
  const missing = input.words.filter((word) => !acceptedIds.has(word.id));

  // Regenerate missing wordIds once so the batch stays diverse.
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
