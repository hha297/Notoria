import { z } from "zod";
import type {
  TheoryExercise,
  TheoryFillBlankExercise,
  TheoryLearningTargetType,
  TheoryMultipleChoiceExercise,
  TheoryTransformationExercise,
} from "@/lib/theory-exercises/types";

export const theoryLearningTargetTypeSchema = z.enum([
  "suffix",
  "prefix",
  "word_form",
  "full_word",
  "structure",
  "concept",
]);

export const theoryAiExerciseSchema = z.object({
  type: z.enum(["fill_blank", "transformation", "multiple_choice"]),
  learningObjective: z.string().min(3).max(240),
  targetType: theoryLearningTargetTypeSchema,
  instruction: z.string().max(200).optional(),
  skillLabel: z.string().max(120).optional(),
  hint: z.string().min(1).max(300),
  explanation: z.string().max(500).optional(),
  materialSource: z.enum(["theory", "vocabulary", "ai"]).optional(),
  sentence: z.string().min(1).max(400).optional(),
  answer: z.string().min(1).max(200).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(200)).max(8).optional(),
  sourceWord: z.string().min(1).max(80).optional(),
  completedSentence: z.string().min(1).max(400).optional(),
  promptWord: z.string().min(1).max(80).optional(),
  prompt: z.string().min(1).max(400).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
  correctOption: z.string().min(1).max(200).optional(),
});

export const theoryAiResponseSchema = z.object({
  theoryFocus: z.string().min(3).max(400).optional(),
  exercises: z.array(theoryAiExerciseSchema).max(30),
});

export type TheoryAiExerciseDraft = z.infer<typeof theoryAiExerciseSchema>;

const BLANK = "________";

/** Normalize any underscore run (AI often uses 3–12) into a single canonical blank. */
export function normalizeBlankMarkers(sentence: string): string {
  const normalized = sentence.replace(/_{3,}/g, BLANK);
  const first = normalized.indexOf(BLANK);
  if (first < 0) return normalized;
  const before = normalized.slice(0, first + BLANK.length);
  const after = normalized.slice(first + BLANK.length).replace(/_{3,}/g, "");
  return `${before}${after}`;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeAnswerKey(value: string) {
  return normalize(value).replace(/^-/, "").toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripEdges(token: string) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * Force a single full-token blank — never glued inside a word.
 * "aihee________" → " ________" ; "________sta" → "________ "
 */
export function forceFullWordBlank(sentence: string): string {
  let s = normalizeBlankMarkers(sentence);
  if (!s.includes(BLANK)) {
    const punct = s.match(/([.!?…]+)$/);
    if (punct) {
      s = `${s.slice(0, -punct[1].length).trimEnd()} ${BLANK}${punct[1]}`;
    } else {
      s = `${s.trim()} ${BLANK}`;
    }
  }

  // Detach letters glued to either side of the blank.
  s = s.replace(/[\p{L}\p{N}'-]+(________)/gu, ` $1`);
  s = s.replace(/(________)[\p{L}\p{N}'-]+/gu, `$1 `);
  s = s.replace(/(\S)(________)/g, "$1 $2");
  s = s.replace(/(________)(\S)/g, (full, blank, next) =>
    /^[.,:;!?]/.test(next) ? `${blank}${next}` : `${blank} ${next}`,
  );
  return normalize(s.replace(/\s+([.,:;!?])/g, "$1"));
}

/**
 * Prefer a complete word form. Recover from completedSentence when AI returns only an ending.
 */
export function resolveFullWordAnswer(input: {
  answer: string;
  sourceWord?: string;
  completedSentence?: string;
}): string | null {
  const answer = normalize(input.answer).replace(/^-/, "");
  if (!answer) return null;

  const source = input.sourceWord ? normalize(input.sourceWord) : "";
  const looksLikeFullForm =
    !source ||
    answer.length > 6 ||
    answer.toLowerCase().startsWith(source.slice(0, Math.min(3, source.length)).toLowerCase()) ||
    source.toLowerCase().startsWith(answer.slice(0, Math.min(3, answer.length)).toLowerCase());

  if (!source || looksLikeFullForm) return answer;

  // Affix-only answer — recover full token from completed sentence.
  const completed = input.completedSentence ? normalize(input.completedSentence) : "";
  if (completed) {
    const tokens = completed.split(/\s+/).map(stripEdges).filter(Boolean);
    const hit = tokens.find((token) => {
      const key = token.toLowerCase();
      return key.endsWith(answer.toLowerCase()) && key.length > answer.length;
    });
    if (hit) return hit;
  }

  return null;
}

/**
 * Remove answer leaks and translation glosses from the visible sentence.
 * Glosses like "(about)" move into the hint instead.
 */
export function scrubFillBlankPresentation(input: {
  prefix?: string;
  suffix?: string;
  answer: string;
  hint: string;
  spaced?: boolean;
}): {
  prefix: string;
  suffix: string;
  hint: string;
  sentence: string;
  completedSentence: string;
} {
  let prefix = (input.prefix ?? "").replace(/\s+$/, "");
  let suffix = (input.suffix ?? "").replace(/^\s+/, "");
  let hint = normalize(input.hint);
  const answer = normalize(input.answer).replace(/^-/, "");
  const answerKey = normalizeAnswerKey(answer);

  const moveGlosses = (text: string) =>
    text.replace(/\s*\(([^)]+)\)\s*/g, (_full, gloss: string) => {
      const g = normalize(gloss);
      if (g && !hint.toLowerCase().includes(g.toLowerCase())) {
        hint = hint ? `${hint} (${g})` : `(${g})`;
      }
      return " ";
    });

  prefix = normalize(moveGlosses(prefix));
  suffix = normalize(moveGlosses(suffix));

  if (answerKey) {
    // Drop trailing prefix token that already is the answer (… historiasta ________).
    const prefixLeak = new RegExp(`(?:^|\\s)(${escapeRegExp(answer)})\\s*$`, "iu");
    prefix = prefix.replace(prefixLeak, "").trimEnd();

    // Drop leading suffix token that repeats the answer (________ historiasta.).
    const suffixLeak = new RegExp(`^(${escapeRegExp(answer)})([.!?…]*)(?:\\s+|$)`, "iu");
    const match = suffix.match(suffixLeak);
    if (match) {
      const punct = match[2] ?? "";
      suffix = `${punct}${suffix.slice(match[0].length)}`.trimStart();
    }
  }

  const joinTail = (tail: string) => (tail ? (/^[.,:;!?]/.test(tail) ? tail : ` ${tail}`) : "");
  const sentence = normalize(
    `${prefix} ${BLANK}${joinTail(suffix)}`.replace(/\s+([.,:;!?])/g, "$1"),
  );
  const completedSentence = normalize(
    `${prefix} ${answer}${joinTail(suffix)}`.replace(/\s+([.,:;!?])/g, "$1"),
  );

  return { prefix, suffix, hint, sentence, completedSentence };
}

function uniqueAnswers(primary: string, extras: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [primary, ...extras]) {
    const value = normalize(raw);
    if (!value) continue;
    const key = normalizeAnswerKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value.replace(/^-/, ""));
  }
  return result;
}

export function looksLikeMetaLabel(value: string): boolean {
  const t = normalize(value);
  if (!t || t.length > 40) return false;
  if (t.includes("/")) return true;
  if (/\?$/.test(t)) return true;
  if (/[+→⇒]/.test(t)) return true;
  if (/^[\p{Lu}\p{M}\s?]{2,16}$/u.test(t) && t === t.toUpperCase() && t.length <= 12) {
    return true;
  }
  return false;
}

function splitSentenceBlank(sentence: string) {
  const index = sentence.indexOf(BLANK);
  if (index < 0) return null;
  return {
    before: sentence.slice(0, index),
    after: sentence.slice(index + BLANK.length),
  };
}

export function answersMatchAny(input: string, accepted: string[]): boolean {
  const normalized = normalizeAnswerKey(input);
  if (!normalized) return false;
  return accepted.some((candidate) => normalizeAnswerKey(candidate) === normalized);
}

function contentKey(item: TheoryExercise): string {
  if (item.type === "fill_blank") {
    return `fill|${normalize(item.sentence).toLowerCase()}`;
  }
  if (item.type === "transformation") {
    return `xf|${item.promptWord.toLowerCase()}|${normalizeAnswerKey(item.answer)}`;
  }
  return `mc|${normalize(item.prompt).toLowerCase()}`;
}

export function dedupeTheoryExercises(
  items: TheoryExercise[],
  maxItems: number,
): TheoryExercise[] {
  const seen = new Set<string>();
  const result: TheoryExercise[] = [];

  for (const item of items) {
    if (result.length >= maxItems) break;
    const key = contentKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

/** Blank must be a full token (not glued inside a word). */
function isFullWordBlank(sentence: string): boolean {
  const split = splitSentenceBlank(sentence);
  if (!split) return false;
  if (/\S$/.test(split.before) && /[\p{L}\p{N}]$/u.test(split.before)) return false;
  if (/^[\p{L}\p{N}]/u.test(split.after)) return false;
  return true;
}

export function isValidTheoryExercise(item: TheoryExercise): boolean {
  if (!item.learningObjective?.trim()) return false;
  if (!item.targetType) return false;
  if (!item.hint?.trim()) return false;

  if (item.type === "fill_blank") {
    if (!item.sentence.includes(BLANK) && !item.prefix) return false;
    if (!item.answer.trim() || item.acceptedAnswers.length === 0) return false;
    if (looksLikeMetaLabel(item.answer)) return false;
    const sentence = item.sentence.includes(BLANK)
      ? item.sentence
      : `${item.prefix ?? ""} ${BLANK}${item.suffix ?? ""}`;
    if (!isFullWordBlank(forceFullWordBlank(sentence))) return false;
    return true;
  }
  if (item.type === "transformation") {
    if (!item.promptWord.trim() || !item.answer.trim()) return false;
    if (item.promptWord.toLowerCase() === item.answer.toLowerCase()) return false;
    if (looksLikeMetaLabel(item.answer)) return false;
    return item.acceptedAnswers.length > 0;
  }
  if (item.type === "multiple_choice") {
    if (item.options.length < 2) return false;
    if (!item.options.includes(item.correctOption)) return false;
    if (looksLikeMetaLabel(item.correctOption)) return false;
    if (item.options.some(looksLikeMetaLabel)) return false;
    return true;
  }
  return false;
}

export function revealTextForExercise(item: TheoryExercise): string {
  if (item.type === "fill_blank" && item.sourceWord?.trim()) {
    return `${item.sourceWord.trim()} → ${item.answer}`;
  }
  if (item.completedSentence?.trim()) return item.completedSentence.trim();
  if (item.type === "fill_blank") {
    if (item.sentence.includes(BLANK)) {
      return item.sentence.replace(BLANK, item.answer);
    }
    if (item.prefix) {
      return `${item.prefix} ${item.answer}${item.suffix ?? ""}`;
    }
    return item.answer;
  }
  if (item.type === "transformation") {
    return `${item.promptWord} → ${item.answer}`;
  }
  return item.correctOption;
}

/** Reject English practice frames when the workspace language is not English. */
export function isWrongStudyLanguageSentence(
  sentence: string,
  studyLanguage?: string,
): boolean {
  if (!studyLanguage?.trim()) return false;
  const lang = studyLanguage.trim().toLowerCase();
  if (/^(en|eng|english|anglais|tiếng anh)/.test(lang)) return false;

  const stripped = sentence
    .replace(/_{3,}/g, " ")
    .replace(/\([^)]*\)/g, " ");
  const words = stripped.match(/\b[a-zA-Z']+\b/g) ?? [];
  if (words.length < 3) return false;

  const englishStops = new Set([
    "i",
    "me",
    "my",
    "we",
    "you",
    "he",
    "she",
    "it",
    "they",
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "from",
    "about",
    "into",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "this",
    "that",
    "these",
    "those",
    "what",
    "when",
    "where",
    "which",
    "who",
    "how",
    "yesterday",
    "today",
    "tomorrow",
    "news",
    "heard",
    "found",
    "article",
    "interested",
    "because",
    "after",
    "before",
    "during",
    "through",
    "their",
    "there",
    "here",
    "just",
    "only",
    "also",
    "very",
    "much",
    "many",
    "some",
    "any",
  ]);
  const hits = words.filter((w) => englishStops.has(w.toLowerCase())).length;
  return hits >= 2 || hits / words.length >= 0.35;
}

function effectiveTargetType(
  targetType: TheoryLearningTargetType,
  hasSourceWord: boolean,
): TheoryLearningTargetType {
  if (hasSourceWord && (targetType === "suffix" || targetType === "prefix")) {
    return "word_form";
  }
  return targetType;
}

export function mapAiDraftsToTheoryExercises(
  theoryId: string,
  drafts: TheoryAiExerciseDraft[],
  fallbackSkill?: string,
  maxItems = 30,
  studyLanguage?: string,
): TheoryExercise[] {
  const items: TheoryExercise[] = [];
  const skill = fallbackSkill?.trim() || undefined;

  for (const draft of drafts) {
    const materialSource = draft.materialSource ?? "ai";
    const skillLabel = draft.skillLabel ?? skill;
    const hint = draft.hint.trim();
    const explanation = draft.explanation?.trim() || undefined;
    const learningObjective = draft.learningObjective.trim();
    const targetType = draft.targetType;
    const completedSentence = draft.completedSentence?.trim() || undefined;
    let sourceWord = draft.sourceWord?.trim() || draft.promptWord?.trim() || undefined;

    if (draft.type === "fill_blank" && draft.sentence && draft.answer) {
      if (isWrongStudyLanguageSentence(draft.sentence, studyLanguage)) continue;

      const answerText = resolveFullWordAnswer({
        answer: draft.answer,
        sourceWord,
        completedSentence,
      });
      if (!answerText) continue;

      // Parenthesis must be the base form, not the declined answer itself.
      if (
        sourceWord &&
        normalizeAnswerKey(sourceWord) === normalizeAnswerKey(answerText)
      ) {
        sourceWord = undefined;
      }

      const sentence = forceFullWordBlank(draft.sentence);
      const split = splitSentenceBlank(sentence);
      if (!split || !isFullWordBlank(sentence)) continue;

      const scrubbed = scrubFillBlankPresentation({
        prefix: split.before,
        suffix: split.after,
        answer: answerText,
        hint,
        spaced: true,
      });
      if (!isFullWordBlank(scrubbed.sentence)) continue;
      if (isWrongStudyLanguageSentence(scrubbed.sentence, studyLanguage)) continue;

      const fill: TheoryFillBlankExercise = {
        id: uid("ai_fill"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource,
        skillLabel,
        instruction: draft.instruction ?? "Fill in the blank.",
        sentence: scrubbed.sentence,
        answer: answerText,
        acceptedAnswers: uniqueAnswers(answerText, draft.acceptedAnswers ?? []),
        hint: scrubbed.hint,
        explanation,
        learningObjective,
        targetType: effectiveTargetType(targetType, Boolean(sourceWord)),
        sourceWord,
        completedSentence: (() => {
          if (!completedSentence) return scrubbed.completedSentence;
          const re = new RegExp(escapeRegExp(answerText), "gi");
          const hits = completedSentence.match(re);
          if (hits && hits.length > 1) return scrubbed.completedSentence;
          return completedSentence;
        })(),
        prefix: scrubbed.prefix || undefined,
        suffix: scrubbed.suffix || undefined,
        spaced: true,
      };
      if (isValidTheoryExercise(fill)) items.push(fill);
      continue;
    }

    if (draft.type === "transformation" && (draft.promptWord || draft.sourceWord) && draft.answer) {
      const promptWord = normalize(draft.promptWord ?? draft.sourceWord ?? "");
      const answerText = resolveFullWordAnswer({
        answer: draft.answer,
        sourceWord: promptWord,
        completedSentence,
      });
      if (!answerText || !promptWord) continue;

      const accepted = uniqueAnswers(answerText, draft.acceptedAnswers ?? []);
      const xf: TheoryTransformationExercise = {
        id: uid("ai_xf"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "transformation",
        typeLabelKey: "transformation",
        materialSource,
        skillLabel,
        instruction: draft.instruction ?? "Complete the form.",
        promptWord,
        answer: answerText,
        acceptedAnswers: accepted,
        showArrow: true,
        hint,
        explanation,
        learningObjective,
        targetType: effectiveTargetType(targetType, true),
        completedSentence: completedSentence ?? `${promptWord} → ${answerText}`,
      };
      if (isValidTheoryExercise(xf)) items.push(xf);
      continue;
    }

    if (draft.type === "multiple_choice") {
      if (
        !draft.prompt ||
        !draft.options ||
        draft.options.length < 2 ||
        !draft.correctOption ||
        !draft.options.includes(draft.correctOption)
      ) {
        continue;
      }
      const accepted = uniqueAnswers(draft.correctOption, draft.acceptedAnswers ?? []);
      const mc: TheoryMultipleChoiceExercise = {
        id: uid("ai_mc"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "multiple_choice",
        typeLabelKey: "multiple_choice",
        materialSource,
        skillLabel,
        instruction: draft.instruction ?? "Choose the correct form.",
        prompt: draft.prompt,
        options: draft.options,
        correctOption: draft.correctOption,
        acceptedAnswers: accepted,
        hint,
        explanation,
        learningObjective,
        targetType,
        completedSentence,
      };
      if (isValidTheoryExercise(mc)) items.push(mc);
    }
  }

  const preferred = [
    ...items.filter((i) => i.type !== "multiple_choice"),
    ...items.filter((i) => i.type === "multiple_choice"),
  ];

  return dedupeTheoryExercises(preferred, maxItems);
}
