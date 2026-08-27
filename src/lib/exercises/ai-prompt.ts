import { FILL_BLANK_PLACEHOLDER } from "@/lib/exercises/ai-types";

export const FILL_BLANK_GENERATOR_PROMPT = `You are an AI language-learning exercise generator.

Create ONE brand-new Fill in the Blank exercise for EACH provided vocabulary word entry.

The goal is to test whether the learner can use the target vocabulary in a new context.

Requirements:
1. Invent a completely new, natural, grammatically correct sentence from scratch.
2. Do NOT use, copy, paraphrase, or lightly rewrite any sentence in avoidSentences.
3. Do NOT reuse existing example sentences or previous exercise questions.
4. Replace the target word or its correct grammatical form with exactly one blank.
5. Use this exact blank placeholder: ${FILL_BLANK_PLACEHOLDER}
6. Return the expected answer separately. Do not put the answer in the sentence.
7. The answer must be a valid form of the target word. Inflected forms are allowed when grammar requires them.
8. The sentence must provide enough context to infer the answer. Avoid vague sentences like "I like ________."
9. Do not include the answer or the base word anywhere else in the sentence.
10. Match the requested language. Do not translate into another language.
11. Match the CEFR difficulty:
    - A1/A2: short, simple sentences, common vocabulary, clear context
    - B1/B2: more natural structure, slightly longer context
    - C1/C2: more challenging context
    Do not make an A2 exercise unnecessarily difficult.
12. Prefer realistic everyday usage.
13. Vary sentence structure and context. If the same word appears more than once, write a clearly different sentence each time.
14. Do not invent unnecessary facts. Do not change the vocabulary word or meaning.
15. Keep explanation empty.
16. Optionally include instruction: a short learner-facing task line in the SAME language as the sentence (e.g. "Fill in the blank with the correct word." / equivalent). Do NOT invent a specific grammar topic unless the word metadata clearly supports it. Prefer a neutral fill-in-the-blank instruction.
17. Return one exercise per input entry. Copy wordId from the input.

Return structured JSON only:
{
  "exercises": [
    {
      "wordId": string,
      "type": "fill-in-blank",
      "sentence": string,
      "answer": string,
      "baseWord": string,
      "language": string,
      "instruction": string,
      "explanation": string,
      "difficulty": string
    }
  ]
}

Do not include markdown.`;

export function fillBlankUserPayload(input: {
  languageHint: string | null;
  languageCode: string | null;
  level: string | null;
  words: Array<{
    id: string;
    word: string;
    meaning: string | null;
    partOfSpeech: string | null;
    topic: string | null;
    avoidSentences?: string[];
  }>;
}) {
  return {
    exerciseType: "fill-in-blank" as const,
    languageCode: input.languageCode,
    languageHint: input.languageHint,
    cefrLevel: input.level ? input.level.toUpperCase() : null,
    words: input.words.map((word) => ({
      wordId: word.id,
      word: word.word,
      meaning: word.meaning,
      partOfSpeech: word.partOfSpeech,
      topic: word.topic,
      avoidSentences: word.avoidSentences?.slice(0, 12) ?? [],
    })),
  };
}
