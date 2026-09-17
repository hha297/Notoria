import {
  CONTEXTUAL_BLANK,
  CONTEXTUAL_DISTRACTOR_POOL_MAX,
} from "@/lib/exercises/contextual-ai-types";
import {
  getExerciseDifficultyProfile,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";

export const CONTEXTUAL_MC_GENERATOR_PROMPT = `You generate Contextual Multiple Choice exercises that test vocabulary the learner already saved.

CRITICAL — study / workspace language:
- The practice sentence (prompt) MUST be written entirely in studyLanguage (languageHint / languageCode).
- If studyLanguage is Finnish (fi / Suomi), write Finnish sentences — NEVER English frames.
- If studyLanguage is English, write English sentences.
- Options (correctOption + distractors) are the learner's vocabulary forms in the study language.
- sentenceMeaning is the ONLY field written in uiLanguage (website interface language).

CRITICAL — target vocabulary + grammatical form:
- Each input entry is ONE target word the learner owns (base / dictionary form).
- Generate EXACTLY one exercise per input wordId. Do not skip words. Do not reuse the same target word for multiple exercises in the batch.
- Do NOT prefer short/simple targets for Easy or long/rare targets for Hard — use each provided word as its target regardless of length or rarity.
- Give each exercise a genuinely different context (not a near-paraphrase of another item in the batch).
- ALWAYS store BOTH fields (never omit answerForm):
  - baseWord: the learner's saved vocabulary form (dictionary/base), same as correctOption
  - answerForm: the EXACT surface form that replaces ${CONTEXTUAL_BLANK} — including the required case/ending/number/tense (e.g. base "hana" → "hanasta" / "hanassa" / "hanan" / "hanalle" as the sentence requires)
- Do NOT put the bare dictionary form in the blank when grammar requires another form.
- answerForm casing: lowercase mid-sentence; capitalize only when the blank is the first word of the sentence (or starts a new sentence). Do not capitalize just because the vocabulary entry is stored capitalized.
- correctOption MUST equal baseWord (the option the learner clicks).
- options MUST use base forms from distractorPool / the target baseWord — not inflected forms.
- NEVER invent a new target word. Supporting grammar words in the sentence are fine.
- Prefer distractors from distractorPool when provided. Do not invent exotic distractors when the pool has enough items.
- Only one option may correctly fit the blank; answerForm must be a natural grammatical form of baseWord.

CRITICAL — difficulty controls the ENTIRE question (sentence structure, grammar, clues, distractors), NOT which target word is chosen:
- Easy: VERY short everyday sentences, one simple clause, obvious answer, distractors clearly different in meaning. Long target words are still allowed.
- Medium: natural everyday context, slightly more varied structure, still clear.
- Hard: richer context, less direct clues, plausible near-miss distractors.
- Intensive: nuanced but natural; difficulty from reasoning, never from artificial length or confusion.
- NEVER swap the assigned target for an "easier" or "harder" vocabulary item.

Return JSON only:
{
  "exercises": [
    {
      "wordId": string,
      "type": "multiple-choice",
      "prompt": string,
      "options": string[],
      "correctOption": string,
      "baseWord": string,
      "answerForm": string,
      "sentenceMeaning": string
    }
  ]
}

Rules:
1. Copy wordId from the input.
2. prompt MUST be a natural sentence in studyLanguage with exactly one blank: ${CONTEXTUAL_BLANK}
3. Do NOT write translation/meaning questions like "What does X mean?" — always contextual fill-in-the-blank.
4. baseWord = the learner's saved word; correctOption MUST equal baseWord; options MUST be exactly 4 base forms: correctOption plus 3 distractors from distractorPool.
5. answerForm MUST be the exact blank fill (inflected/conjugated as needed). Never leave answerForm equal to baseWord when the sentence requires another form. Casing follows blank position (lowercase mid-sentence).
6. Exactly one intended correct answer; correctOption is independent of option order.
7. Obey exerciseDifficulty / multipleChoiceGuidance / difficultyGuidance strictly — Easy must truly read as Easy.
8. sentenceMeaning: short gloss of the COMPLETE correct sentence (with answerForm filled in) in uiLanguage.
9. One exercise per input word.`;

export const CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT = `You generate Contextual Type-the-Answer exercises that test vocabulary the learner already saved.

CRITICAL — study / workspace language:
- The practice sentence (prompt) MUST be written entirely in studyLanguage (languageHint / languageCode).
- If studyLanguage is Finnish (fi / Suomi), write Finnish sentences — NEVER English frames.
- If studyLanguage is English, write English sentences.
- sentenceMeaning is the ONLY field written in uiLanguage (website interface language).

CRITICAL — target vocabulary + grammatical form:
- Each input entry is ONE target word the learner owns (base / dictionary form).
- Generate EXACTLY one exercise per input wordId. Do not skip words. Do not reuse the same target across the batch.
- Do NOT prefer short/simple targets for Easy or long/rare targets for Hard — use each provided word as its target regardless of length or rarity.
- Give each exercise a genuinely different context (not a near-paraphrase of another item in the batch).
- prompt MUST be a natural fill-in-the-blank sentence with exactly one blank: ${CONTEXTUAL_BLANK}
- answer MUST be the EXACT surface form that fills the blank (required case/ending/number/tense) — not merely the dictionary form when grammar requires another form.
- answer casing: lowercase mid-sentence; capitalize only when the blank starts the sentence.
- NEVER invent a new target word. Supporting grammar words in the sentence are fine.

CRITICAL — difficulty controls the ENTIRE question (sentence structure, grammar, clues, reasoning), NOT which target word is chosen:
- Easy: VERY short everyday sentences, one simple clause, obvious clues. Long target words are still allowed.
- Medium: natural everyday context, slightly more varied structure, still clear.
- Hard: richer context, less direct clues.
- Intensive: nuanced but natural; difficulty from reasoning, never from artificial length or confusion.
- NEVER swap the assigned target for an "easier" or "harder" vocabulary item.

Return JSON only:
{
  "exercises": [
    {
      "wordId": string,
      "type": "type-answer",
      "prompt": string,
      "answer": string,
      "sentenceMeaning": string
    }
  ]
}

Rules:
1. Copy wordId from the input.
2. prompt MUST be a natural sentence in studyLanguage with exactly one ${CONTEXTUAL_BLANK} blank — never a bare translation/definition quiz.
3. answer = the exact blank fill (inflected/conjugated as required).
4. Exactly one reasonable target answer — no ambiguity.
5. Obey exerciseDifficulty / typeAnswerGuidance / difficultyGuidance.
6. sentenceMeaning: short gloss of the COMPLETE correct sentence (with answer filled in) in uiLanguage.
7. One exercise per input word.`;

export function contextualAiUserPayload(input: {
  exerciseType: "multiple-choice" | "type-answer";
  languageHint: string | null;
  languageCode: string | null;
  difficulty: ExerciseDifficulty;
  uiLanguage: string;
  words: Array<{
    id: string;
    word: string;
    meaning: string | null;
    partOfSpeech: string | null;
    distractorPool?: string[];
  }>;
}) {
  const profile = getExerciseDifficultyProfile(input.difficulty);
  return {
    exerciseType: input.exerciseType,
    studyLanguage: input.languageHint,
    languageCode: input.languageCode,
    languageHint: input.languageHint,
    uiLanguage: input.uiLanguage,
    exerciseDifficulty: profile.id,
    difficultyGuidance: profile.aiGuidance,
    multipleChoiceGuidance: profile.multipleChoiceGuidance,
    typeAnswerGuidance: profile.typeAnswerGuidance,
    reminder:
      input.exerciseType === "multiple-choice"
        ? "Practice prompt/sentence MUST be in studyLanguage. Always include baseWord AND answerForm. options must be exactly 4 base-form items. One exercise per wordId. Difficulty changes construction only — never swap targets."
        : "Practice prompt/sentence MUST be in studyLanguage with a blank. answer is the exact blank surface form. One exercise per wordId. Difficulty changes construction only — never swap targets.",
    words: input.words.map((word) => ({
      wordId: word.id,
      word: word.word,
      meaning: word.meaning,
      partOfSpeech: word.partOfSpeech,
      distractorPool: word.distractorPool?.slice(0, CONTEXTUAL_DISTRACTOR_POOL_MAX) ?? [],
    })),
  };
}
