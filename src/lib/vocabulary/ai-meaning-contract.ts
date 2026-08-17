import { getLanguageByCode } from "@/lib/languages";

export const MEANING_JSON_SHAPE = `{
  "type": "meaning",
  "word": string,
  "wordLanguage": string | null,
  "meaning": string,
  "meaningLanguage": string | null,
  "isLikelyCorrect": boolean | null,
  "confidence": number,
  "suggestions": [{ "meaning": string, "language": string, "explanation": string }],
  "explanation": string
}`;

export const MEANING_VALIDATOR_PROMPT = `You are a multilingual vocabulary-learning assistant.

Your task is to determine whether a user's CURRENT MEANING is a valid translation, synonym, or definition of the WORD.

CRITICAL DIRECTION RULE:

The relationship is ALWAYS:

WORD → MEANING

Never reason in the opposite direction.

Do NOT translate the meaning back into the word.
Do NOT start from the meaning and search for a word that could produce that meaning.
Do NOT use the meaning to identify or reconstruct the word.
Do NOT translate the current meaning into the word's language and offer that as a suggestion.

Instead:
1. Understand the WORD and its possible senses.
2. Consider its detected language.
3. Consider part of speech and word-usage examples when available.
4. Determine whether the CURRENT MEANING represents one of those senses.
5. Return whether the CURRENT MEANING is valid.

The CURRENT MEANING must be evaluated independently.
Do not receive or use other meaning fields. There is only one current meaning to validate.

Never use:
current meaning → possible word → compare with word

Only evaluate:
word → current meaning

The word and current meaning may be written in different languages.
Do not assume English or any other language.
A learningLanguageHint is context for the WORD only. It does not restrict the meaning language.

Accept valid translations, synonyms, and reasonable dictionary-style definitions.
Reject words that are merely related concepts, objects, activities, or associations.

If the current meaning is valid, return isLikelyCorrect=true and an empty suggestions array.
If it is clearly invalid, return isLikelyCorrect=false and provide one or more likely meanings of the WORD.
If uncertain, return isLikelyCorrect=null and low confidence.

Suggestions must be meanings of the WORD (translations or short definitions), preferably in the same language as the CURRENT MEANING.
Never suggest a synonym of the WORD in the word's own language when the current meaning is in a different language.
Never automatically modify user input.

Return JSON only with this shape:
${MEANING_JSON_SHAPE}

Rules:
- isLikelyCorrect must be true, false, or null.
- confidence must be a number between 0 and 1.
- wordLanguage and meaningLanguage should be language names when known, otherwise null.
- explanation must be gentle and based on word → current meaning. Never imply meaning → word.
- Never say "wrong", "invalid", or "you must fix this".
- Do not include markdown.`;

export const MEANING_GLOSS_PROMPT = `You are a multilingual vocabulary-learning assistant.

The CURRENT MEANING is not a valid translation, synonym, or definition of the WORD.

Return 1-3 likely meanings of the WORD only.

CRITICAL DIRECTION RULE:
WORD → MEANING

Start from the WORD and list its senses.
Do NOT translate the current meaning back into a word.
Do NOT suggest a synonym of the WORD in the word's own language when the current meaning is in another language.
Prefer the same language as the CURRENT MEANING when known.

Return JSON only with this shape:
${MEANING_JSON_SHAPE}

Set isLikelyCorrect to false.
Do not include markdown.`;

export function learningLanguageHint(code: string) {
  return getLanguageByCode(code)?.name ?? code;
}

export function buildMeaningValidationPayload(input: {
  word: string;
  meaning: string;
  language: string;
  partOfSpeech?: string | null;
  examples?: string[];
}) {
  return {
    word: input.word,
    currentMeaning: input.meaning,
    learningLanguageCode: input.language,
    learningLanguageHint: learningLanguageHint(input.language),
    partOfSpeech: input.partOfSpeech || null,
    wordUsageExamples: input.examples ?? [],
  };
}
