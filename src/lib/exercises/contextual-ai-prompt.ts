import {
  CONTEXTUAL_BLANK,
  CONTEXTUAL_DISTRACTOR_POOL_MAX,
} from "@/lib/exercises/contextual-ai-types";
import {
  LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE,
  LEXICAL_SURFACE_GUIDANCE,
  LEXICAL_SURFACE_MC_GUIDANCE,
} from "@/lib/exercises/lexical-surface";
import {
  getExerciseDifficultyProfile,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";

export const CONTEXTUAL_MC_GENERATOR_PROMPT = `You generate Contextual Multiple Choice exercises that test vocabulary the learner already saved.

CRITICAL — study / workspace language:
- completeSentence MUST be written entirely in studyLanguage (languageHint / languageCode).
- Never write the sentence in a different language than studyLanguage.
- Options (correctOption + distractors) are study-language forms for the same grammatical slot as the used token.
- sentenceMeaning is the ONLY field written in uiLanguage (website interface language).

${LEXICAL_SURFACE_GUIDANCE}

${LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE}

${LEXICAL_SURFACE_MC_GUIDANCE}

CRITICAL — target vocabulary identity:
- Each input entry is ONE target word the learner owns (lemma / dictionary form in "word").
- Generate EXACTLY one exercise per input wordId. Do not skip words. Do not reuse the same target word for multiple exercises in the batch.
- Do NOT prefer short/simple targets for Easy or long/rare targets for Hard — use each provided word as its target regardless of length or rarity.
- Give each exercise a genuinely different context (not a near-paraphrase of another item in the batch).
- ALWAYS store BOTH fields (never omit answerForm):
  - baseWord: the learner's saved vocabulary form (lemma). Do not modify it.
  - answerForm: the EXACT token that appears in completeSentence (the used grammatical form)
  - correctOption: MUST equal answerForm (the option the learner clicks)
- answerForm casing: copy the token as it appears in completeSentence (lowercase mid-sentence; capitalize only when that token starts the sentence).
- NEVER invent a new target word. Supporting grammar words in the sentence are fine.
- Prefer distractors from distractorPool when provided. Do not invent exotic distractors when the pool has enough items.
- Only one option may correctly occupy the slot of the used token.

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
      "completeSentence": string,
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
2. completeSentence MUST be a natural, fully grammatical sentence in studyLanguage that already contains the correctly inflected target token. It MUST NOT contain ${CONTEXTUAL_BLANK} or any underscore placeholder.
3. Do NOT write translation/meaning questions like "What does X mean?" — always a complete contextual sentence.
4. The application will replace the exact answerForm token with a blank after validation. Do not blank the sentence yourself. Do not inflect again after writing the sentence.
5. baseWord = the learner's saved lemma; correctOption MUST equal answerForm (the token used in completeSentence); options MUST be exactly 4 items: correctOption plus 3 distractors, each in a form that could occupy that same slot.
6. answerForm MUST be copied from completeSentence. Never leave answerForm equal to baseWord when the sentence used another form.
7. Exactly one intended correct answer; correctOption is independent of option order.
8. Obey exerciseDifficulty / multipleChoiceGuidance / difficultyGuidance strictly — Easy must truly read as Easy.
9. sentenceMeaning: short gloss of completeSentence (already including answerForm) in uiLanguage.
10. One exercise per input word.`;

export const CONTEXTUAL_TYPE_ANSWER_GENERATOR_PROMPT = `You generate Contextual Type-the-Answer exercises that test vocabulary the learner already saved.

CRITICAL — study / workspace language:
- completeSentence MUST be written entirely in studyLanguage (languageHint / languageCode).
- Never write the sentence in a different language than studyLanguage.
- sentenceMeaning is the ONLY field written in uiLanguage (website interface language).

${LEXICAL_SURFACE_GUIDANCE}

${LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE}

CRITICAL — target vocabulary identity:
- Each input entry is ONE target word the learner owns (lemma / dictionary form in "word").
- Generate EXACTLY one exercise per input wordId. Do not skip words. Do not reuse the same target across the batch.
- Do NOT prefer short/simple targets for Easy or long/rare targets for Hard — use each provided word as its target regardless of length or rarity.
- Give each exercise a genuinely different context (not a near-paraphrase of another item in the batch).
- completeSentence MUST be a natural complete sentence with the correctly inflected target already in it — never a blank and never an underscore placeholder.
- answer MUST be the EXACT token that appears in completeSentence — not merely the dictionary form when the sentence used another form.
- answer casing: copy the token as it appears in completeSentence.
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
      "completeSentence": string,
      "answer": string,
      "sentenceMeaning": string
    }
  ]
}

Rules:
1. Copy wordId from the input.
2. completeSentence MUST be a natural, fully grammatical sentence in studyLanguage that already contains the correctly inflected target token — never a bare translation/definition quiz, and never ${CONTEXTUAL_BLANK}.
3. The application will replace that exact answer token with a blank after validation. Do not blank the sentence yourself. Do not inflect again after writing the sentence.
4. answer = the exact token used in completeSentence.
5. Exactly one reasonable target answer — no ambiguity.
6. Obey exerciseDifficulty / typeAnswerGuidance / difficultyGuidance.
7. sentenceMeaning: short gloss of completeSentence (already including the answer token) in uiLanguage.
8. One exercise per input word.`;

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
  regenerateReason?: string;
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
        ? "Write completeSentence in studyLanguage with the correctly inflected target already in the sentence — no blank. Return that exact token as answerForm and correctOption. baseWord stays the lemma. options must be exactly 4 contextual forms for that same slot. One exercise per wordId. Difficulty changes construction only — never swap targets."
        : "Write completeSentence in studyLanguage with the correctly inflected target already in the sentence — no blank. answer is that exact in-sentence token, not automatically the saved lemma. One exercise per wordId. Difficulty changes construction only — never swap targets.",
    regenerateReason: input.regenerateReason,
    words: input.words.map((word) => ({
      wordId: word.id,
      lemma: word.word,
      word: word.word,
      meaning: word.meaning,
      partOfSpeech: word.partOfSpeech,
      distractorPool:
        word.distractorPool?.slice(0, CONTEXTUAL_DISTRACTOR_POOL_MAX) ?? [],
    })),
  };
}
