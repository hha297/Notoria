import { vocabularyAiFields } from "@/lib/ai/bounds";
import { additionalInstructionFields } from "@/lib/exercises/additional-instructions";
import {
  GRAMMAR_FORM_HINT_PROMPT,
  progressiveHintPayload,
} from "@/lib/exercises/progressive-hints";
import { FILL_BLANK_PLACEHOLDER } from "@/lib/exercises/ai-types";
import {
  LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE,
  LEXICAL_SURFACE_GUIDANCE,
} from "@/lib/exercises/lexical-surface";
import {
  getExerciseDifficultyProfile,
  parseExerciseDifficulty,
  type ExerciseDifficulty,
} from "@/lib/exercises/difficulty";

export const FILL_BLANK_GENERATOR_PROMPT = `You are an AI language-learning exercise generator.

Create ONE brand-new Fill in the Blank exercise for EACH provided vocabulary word entry.

The goal is to test whether the learner can use the target vocabulary in a new context.

${LEXICAL_SURFACE_GUIDANCE}

${LEXICAL_COMPLETE_THEN_BLANK_GUIDANCE}

Requirements:
1. Invent a completely new, natural, grammatically correct sentence from scratch.
2. Do NOT use, copy, paraphrase, or lightly rewrite any sentence in avoidSentences.
3. Do NOT reuse existing example sentences or previous exercise questions.
4. Write completeSentence first: a FULL grammatical study-language sentence that already contains the correctly inflected target token. Then set answer to that exact in-sentence token. Then produce sentence by replacing ONLY that token with the blank. Never blank first and guess the inflection afterward.
5. Use this exact blank placeholder: ${FILL_BLANK_PLACEHOLDER}
6. Return the expected answer separately. Do not put the answer in the blanked sentence field.
7. answer MUST equal the exact surface form that appears in completeSentence (and fills the blank). baseWord MUST stay the saved lemma. Inflected, conjugated, agreeing, or other context-required forms are mandatory when grammar needs them. Never copy the lemma into the answer when the sentence requires another form.
8. CRITICAL — sentence-driven morphology (read the WHOLE sentence before choosing a form):
   - Determine number, case, tense, person, agreement, and other required morphology from the surrounding words and syntactic role — not from partOfSpeech alone and not from a guessed "common" form.
   - Numerals, quantifiers, prepositions/postpositions, verbs, and agreement targets constrain the blank. The answer must satisfy ALL of those constraints at once.
   - Reject frames where more than one grammatical form would be equally defensible; rewrite until one form is clearly required.
   - instruction (if present), sentenceMeaning, and answer must describe the SAME grammatical outcome. Never label one category while returning another.
9. CRITICAL — meaningful context aligned with the taught meaning:
   - The sentence must clearly reflect the specific vocabulary meaning provided (if the word has multiple senses, use THAT meaning).
   - Provide enough context that a learner understands what is happening and why this word fits.
   - Avoid vague, incomplete, or context-free frames that leave the blank unconstrained.
   - Prefer natural everyday usage a teacher would accept as a useful example.
   - Make the answer inferable from context without being trivially spoon-fed.
10. Do not include the answer or the base word anywhere else in the blanked sentence.
11. Match the requested language. Do not translate into another language.
12. Follow exerciseDifficulty + fillBlankGuidance in the user payload exactly (Easy / Medium / Hard / Intensive).
    Difficulty means how the *same* learner word is tested (context complexity / cognitive demand) — NOT selecting harder vocabulary and NOT longer/obscure/unnatural sentences.
    Keep a clear, defensible correct answer. Never change the taught meaning just to feel harder.
    NEVER introduce a new target word that was not provided in the input list.
13. Prefer realistic everyday usage. Avoid artificial AI-sounding sentences.
14. Vary sentence structure and context. If the same word appears more than once, write a clearly different sentence each time.
15. Do not invent unnecessary facts. Do not change the vocabulary word or meaning.
16. Keep explanation empty.
17. Optionally include instruction: a short neutral learner-facing task line in the SAME language as the sentence. Do NOT invent a specific grammar topic unless the word metadata clearly supports it.
18. ALWAYS include sentenceMeaning: a short natural translation/gloss of the COMPLETE correct sentence (with the answer filled in).
    - Write sentenceMeaning in uiLanguage (the website interface language), NOT in the practice/study language (unless they are the same).
    - Do NOT put sentenceMeaning inside the practice sentence. It is a separate field for post-answer UI.
19. Prefer sentence-final punctuation attached immediately after the blank — avoid leaving a lone period as a separate fragment.
20. Return one exercise per input entry. Copy wordId from the input.
21. Quality test: would a language teacher consider this a useful example for this exact word/meaning with this exact blank form? If not, rewrite.
22. Put the selected exerciseDifficulty id into the difficulty field of each exercise.

${GRAMMAR_FORM_HINT_PROMPT}

Return structured JSON only:
{
  "exercises": [
    {
      "wordId": string,
      "type": "fill-in-blank",
      "completeSentence": string,
      "sentence": string,
      "answer": string,
      "baseWord": string,
      "language": string,
      "instruction": string,
      "explanation": string,
      "difficulty": string,
      "sentenceMeaning": string,
      "hints": string[]
    }
  ]
}

Do not include markdown.`;

export function fillBlankUserPayload(input: {
  languageHint: string | null;
  languageCode: string | null;
  level?: string | null;
  difficulty?: ExerciseDifficulty | null;
  uiLanguage: string;
  words: Array<{
    id: string;
    word: string;
    meaning: string | null;
    partOfSpeech: string | null;
    topic: string | null;
    avoidSentences?: string[];
  }>;
  regenerateReason?: string;
  additionalInstructions?: string | null;
  submittedMistake?: string | null;
}) {
  const difficulty = parseExerciseDifficulty(
    input.difficulty ?? null,
    input.level ? mapLegacyCefrToDifficulty(input.level) : "medium",
  );
  const profile = getExerciseDifficultyProfile(difficulty);

  return {
    exerciseType: "fill-in-blank" as const,
    languageCode: input.languageCode,
    languageHint: input.languageHint,
    uiLanguage: input.uiLanguage,
    exerciseDifficulty: profile.id,
    difficultyGuidance: profile.aiGuidance,
    fillBlankGuidance: profile.fillBlankGuidance,
    reminder:
      "Practice sentence/answer must be in languageHint. Write completeSentence first with the correctly inflected target already inside it; answer must be that exact token; sentence blanks only that token. ALWAYS include sentenceMeaning in uiLanguage (website language), not the study language. Obey difficultyGuidance and fillBlankGuidance. Target words must come from the provided list only. Difficulty controls sentence construction only — never swap targets. word/baseWord is the lemma; answer is the contextual surface form required by the FULL sentence (case/number/tense/agreement). Hints follow hintStrategy=grammar-form: grammar/structure only in explanationLanguage; never restate the on-screen meaning gloss; never invent spelling masks or reveal the full answer.",
    regenerateReason: input.regenerateReason,
    ...additionalInstructionFields(input.additionalInstructions),
    ...progressiveHintPayload({
      explanationLanguage: input.uiLanguage,
      difficulty: profile.id,
      submittedMistake: input.submittedMistake,
      strategy: "grammar-form",
    }),
    words: input.words.map((word) => {
      const fields = vocabularyAiFields({
        word: word.word,
        meaning: word.meaning,
        partOfSpeech: word.partOfSpeech,
        topic: word.topic,
      });
      return {
        wordId: word.id,
        lemma: fields.word,
        word: fields.word,
        meaning: fields.meaning,
        partOfSpeech: fields.partOfSpeech,
        topic: fields.topic,
        avoidSentences: word.avoidSentences?.slice(0, 12) ?? [],
      };
    }),
  };
}

function mapLegacyCefrToDifficulty(level: string): ExerciseDifficulty {
  const normalized = level
    .trim()
    .toLowerCase()
    .replace(/^cefr-/, "");
  if (normalized === "a1" || normalized === "a2") return "easy";
  if (normalized === "b1") return "medium";
  if (normalized === "b2") return "hard";
  if (normalized === "c1" || normalized === "c2") return "intensive";
  return "medium";
}
