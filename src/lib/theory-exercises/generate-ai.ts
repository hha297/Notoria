import { z } from "zod";
import { isRelatedWordForm } from "@/lib/exercises/lexical-surface";
import { resolveProgressiveHints } from "@/lib/exercises/progressive-hints";
import {
  enforceExampleReuseLimit,
  type TheoryGenerationMaterial,
} from "@/lib/theory-exercises/theory-material";
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
  instruction: z.string().max(400).optional(),
  skillLabel: z.string().max(120).optional(),
  hint: z.string().min(1).max(300),
  hints: z.array(z.string().trim().max(240)).max(3).optional().catch(undefined),
  explanation: z.string().max(500).optional(),
  materialSource: z.enum(["theory", "vocabulary", "ai"]).optional(),
  sentence: z.string().min(1).max(400).optional(),
  answer: z.string().min(1).max(200).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(200)).max(8).optional(),
  sourceWord: z.string().min(1).max(80).optional(),
  completedSentence: z.string().min(1).max(400).optional(),
  /** Whole-sentence meaning/gloss in the website UI language (not study language). */
  sentenceMeaning: z.string().min(1).max(400).optional(),
  promptWord: z.string().min(1).max(80).optional(),
  prompt: z.string().min(1).max(400).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
  correctOption: z.string().min(1).max(200).optional(),
  /** When false, UI shows cue + blank line instead of "cue → blank". */
  showArrow: z.boolean().optional(),
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
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function normalizeAnswerKey(value: string) {
  return normalize(value).replace(/^-/, "").toLowerCase();
}

function letterTokens(text: string): string[] {
  return text.match(/\p{L}[\p{L}\p{M}'’-]*\p{L}|\p{L}/gu) ?? [];
}

function wholeTokenRegex(form: string, flags: string) {
  return new RegExp(
    `(^|[^\\p{L}\\p{M}])(${escapeRegExp(form)})(?=[^\\p{L}\\p{M}]|$)`,
    flags.includes("u") ? flags : `${flags}u`,
  );
}

function countWholeTokens(haystack: string, needle: string): number {
  const value = needle.trim();
  if (!value) return 0;
  return [...haystack.matchAll(wholeTokenRegex(value, "giu"))].length;
}

function containsWholeToken(haystack: string, needle: string): boolean {
  return countWholeTokens(haystack, needle) > 0;
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
 * Parenthetical after the blank is either:
 * - a base-word cue for form practice → show next to ________ (not in the hint)
 * - a translation gloss → move into the hint
 */
function isSourceWordCue(gloss: string): boolean {
  const g = gloss.trim();
  if (!g || /\s/.test(g)) return false;
  if (g.length > 40) return false;
  // Common English glosses / function words — never treat as the lemma cue.
  if (
    /^(about|the|a|an|from|to|of|in|on|at|for|with|by|into|over|under|than|as|like|into|onto|upon|this|that|these|those|and|or|but)$/i.test(
      g,
    )
  ) {
    return false;
  }
  // Single token (letters / study-language letters / hyphen) → lemma cue.
  return /^[\p{L}\p{M}'’-]+$/u.test(g);
}

/** Pull a trailing "(lemma)" cue out of a hint for display next to the blank. */
export function extractSourceWordCueFromHint(hint: string): {
  cue?: string;
  hint: string;
} {
  const normalized = normalize(hint);
  const match = normalized.match(/\(([^)]+)\)\s*$/u);
  if (!match?.[1] || !isSourceWordCue(match[1])) {
    return { hint: normalized };
  }
  const cue = normalize(match[1]);
  return {
    cue,
    hint: stripParentheticalCue(normalized, cue),
  };
}

function stripParentheticalCue(hint: string, cue: string): string {
  const escaped = escapeRegExp(cue.trim());
  if (!escaped) return hint;
  return normalize(
    hint
      .replace(new RegExp(`\\(\\s*${escaped}\\s*\\)`, "giu"), " ")
      .replace(/\s{2,}/g, " "),
  );
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
  /** Known lemma cue — keep out of the hint even if also written in the sentence. */
  sourceWord?: string;
}): {
  prefix: string;
  suffix: string;
  hint: string;
  sentence: string;
  completedSentence: string;
  /** Lemma extracted from parentheses for display next to the blank. */
  sourceWordCue?: string;
} {
  let prefix = (input.prefix ?? "").replace(/\s+$/, "");
  let suffix = (input.suffix ?? "").replace(/^\s+/, "");
  let hint = normalize(input.hint);
  let sourceWordCue = normalize(input.sourceWord ?? "") || undefined;
  const answer = normalize(input.answer).replace(/^-/, "");
  const answerKey = normalizeAnswerKey(answer);

  const moveParentheticals = (text: string) =>
    text.replace(/\s*\(([^)]+)\)\s*/g, (_full, gloss: string) => {
      const g = normalize(gloss);
      if (!g) return " ";

      if (
        (sourceWordCue &&
          normalizeAnswerKey(g) === normalizeAnswerKey(sourceWordCue)) ||
        isSourceWordCue(g)
      ) {
        if (
          !sourceWordCue ||
          normalizeAnswerKey(g) !== normalizeAnswerKey(answer)
        ) {
          sourceWordCue = sourceWordCue ?? g;
        }
        return " ";
      }

      if (g && !hint.toLowerCase().includes(g.toLowerCase())) {
        hint = hint ? `${hint} (${g})` : `(${g})`;
      }
      return " ";
    });

  prefix = normalize(moveParentheticals(prefix));
  suffix = normalize(moveParentheticals(suffix));

  if (sourceWordCue) {
    hint = stripParentheticalCue(hint, sourceWordCue);
    if (normalizeAnswerKey(sourceWordCue) === answerKey) {
      sourceWordCue = undefined;
    }
  }

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

  return { prefix, suffix, hint, sentence, completedSentence, sourceWordCue };
}

function uniqueAnswers(primary: string, extras: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of [primary, ...extras]) {
    const value = normalize(raw).replace(/^-/, "");
    if (!value) continue;
    const key = normalizeAnswerKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    // Accept simple casing variants without inventing new spellings.
    const lower = value.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      if (lower !== value) result.push(lower);
    }
  }
  return result;
}

/**
 * Blank the exact answer token inside a complete sentence.
 * Keeps generation → grading → feedback on one canonical surface form.
 */
export function blankAnswerFromCompletedSentence(
  completedSentence: string,
  answer: string,
): { sentence: string; prefix: string; suffix: string; answer: string } | null {
  const completed = normalize(completedSentence);
  const form = normalize(answer).replace(/^-/, "");
  if (!completed || !form || completed.includes(BLANK)) return null;
  if (countWholeTokens(completed, form) !== 1) return null;

  const match =
    wholeTokenRegex(form, "u").exec(completed) ??
    wholeTokenRegex(form, "iu").exec(completed);
  if (!match || match.index === undefined || match[2] == null) return null;

  const used = match[2];
  const prefixPad = match[1] ?? "";
  const start = match.index + prefixPad.length;
  const prefix = completed.slice(0, start);
  const suffix = completed.slice(start + used.length);
  const sentence = normalize(
    `${prefix}${BLANK}${suffix}`.replace(/\s+([.,:;!?])/g, "$1"),
  );
  if (!sentence.includes(BLANK)) return null;
  if (containsWholeToken(sentence.replace(/_{3,}/g, " "), used)) return null;
  return { sentence, prefix, suffix, answer: used };
}

/**
 * Visible context (outside the blank) must not already supply the target form,
 * and form-practice blanks must transform the given source cue.
 */
export function hasObjectiveAlignmentIssue(input: {
  prefix: string;
  suffix: string;
  answer: string;
  sourceWord?: string;
  needsSourceWord: boolean;
}): boolean {
  const answer = normalize(input.answer).replace(/^-/, "");
  const visible = normalize(`${input.prefix} ${input.suffix}`);
  if (!answer) return true;

  if (containsWholeToken(visible, answer)) return true;

  if (input.needsSourceWord) {
    const source = input.sourceWord?.trim() ?? "";
    if (!source) return true;
    if (normalizeAnswerKey(source) === normalizeAnswerKey(answer)) return true;
    if (!isRelatedWordForm(source, answer)) return true;

    // Another inflected form of the same lemma already visible → objective given away
    // while the blank may ask for something else.
    // Skip tiny tokens: isRelatedWordForm uses substring checks that false-positive on
    // single letters contained in the lemma (e.g. "topic".includes("i")).
    const minTokenLen = Math.min(3, Math.max(2, source.length - 1));
    for (const token of letterTokens(visible)) {
      if (token.length < minTokenLen) continue;
      if (normalizeAnswerKey(token) === normalizeAnswerKey(source)) continue;
      if (normalizeAnswerKey(token) === normalizeAnswerKey(answer)) return true;
      if (
        isRelatedWordForm(source, token) &&
        normalizeAnswerKey(token) !== normalizeAnswerKey(source)
      ) {
        return true;
      }
    }
  }

  return false;
}

/** Enough surrounding material that the blank is not open vocabulary guessing. */
export function hasEnoughPreAnswerContext(input: {
  prefix: string;
  suffix: string;
  sourceWord?: string;
  needsSourceWord: boolean;
  hint: string;
}): boolean {
  if (input.needsSourceWord && !input.sourceWord?.trim()) return false;
  const visible = `${input.prefix} ${input.suffix}`;
  const tokens = letterTokens(visible).filter((t) => t.length >= 2);
  if (tokens.length >= 2) return true;
  // Transformation-style cue with source word + short frame is answerable.
  if (input.needsSourceWord && input.sourceWord?.trim() && tokens.length >= 1) {
    return true;
  }
  // Concept/structure items may be shorter if the hint carries the task.
  if (!input.needsSourceWord && input.hint.trim().length >= 8 && tokens.length >= 1) {
    return true;
  }
  return false;
}

export function hintLeaksAnswer(hint: string, answer: string): boolean {
  const h = normalize(hint);
  const a = normalize(answer).replace(/^-/, "");
  if (!h || !a) return false;
  if (normalizeAnswerKey(h) === normalizeAnswerKey(a)) return true;
  return containsWholeToken(h, a);
}

/**
 * Reject explanations that only restate the topic/title without explaining
 * the actual source→answer transformation in context.
 */
export function isVagueExplanation(input: {
  explanation?: string | null;
  learningObjective?: string | null;
  skillLabel?: string | null;
  sourceWord?: string | null;
  answer?: string | null;
}): boolean {
  const explanation = normalize(input.explanation ?? "");
  if (!explanation) return false;
  if (explanation.length < 8) return true;

  const explKey = normalizeAnswerKey(explanation);
  const skill = normalize(input.skillLabel ?? "");
  const objective = normalize(input.learningObjective ?? "");
  const source = input.sourceWord?.trim() ?? "";
  const answer = input.answer?.trim().replace(/^-/, "") ?? "";

  // Exact topic/title echo with no extra guidance.
  if (skill && normalizeAnswerKey(skill) === explKey) return true;
  if (objective && normalizeAnswerKey(objective) === explKey) {
    const mentionsSource =
      source.length >= 2 &&
      explanation.toLowerCase().includes(source.toLowerCase());
    const mentionsAnswer =
      answer.length >= 2 &&
      explanation.toLowerCase().includes(answer.toLowerCase());
    if (!mentionsSource && !mentionsAnswer) return true;
  }

  return false;
}

/**
 * Instruction must not claim a transformation that ignores the actual cue→answer pair.
 * Language-agnostic: when both cue and answer exist, instruction cannot be empty for form drills.
 */
export function instructionUnanswerable(input: {
  instruction?: string | null;
  learningObjective?: string | null;
  needsSourceWord: boolean;
  sourceWord?: string | null;
}): boolean {
  if (!input.needsSourceWord) return false;
  if (!input.sourceWord?.trim()) return true;
  const task = normalize(input.instruction ?? "") || normalize(input.learningObjective ?? "");
  return task.length < 8;
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
  return accepted.some(
    (candidate) => normalizeAnswerKey(candidate) === normalized,
  );
}

/** Canonical completed sentence from blank parts — never trust a divergent AI string alone. */
export function buildCanonicalCompletedSentence(input: {
  prefix?: string;
  suffix?: string;
  answer: string;
  sentence?: string;
}): string {
  const answer = normalize(input.answer).replace(/^-/, "");
  if (input.prefix != null || input.suffix != null) {
    const prefix = (input.prefix ?? "").replace(/\s+$/, "");
    const suffix = (input.suffix ?? "").replace(/^\s+/, "");
    const joinTail = (tail: string) =>
      tail ? (/^[.,:;!?]/.test(tail) ? tail : ` ${tail}`) : "";
    return normalize(
      `${prefix} ${answer}${joinTail(suffix)}`.replace(/\s+([.,:;!?])/g, "$1"),
    );
  }
  if (input.sentence?.includes(BLANK)) {
    return normalize(input.sentence.replace(BLANK, answer));
  }
  return answer;
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
    if (hintLeaksAnswer(item.hint ?? "", item.answer)) return false;

    const needsSourceWord =
      item.targetType === "suffix" ||
      item.targetType === "prefix" ||
      item.targetType === "word_form";

    const sentence = item.sentence.includes(BLANK)
      ? item.sentence
      : `${item.prefix ?? ""} ${BLANK}${item.suffix ?? ""}`;
    if (!isFullWordBlank(forceFullWordBlank(sentence))) return false;

    const split = splitSentenceBlank(forceFullWordBlank(sentence));
    if (!split) return false;

    if (
      hasObjectiveAlignmentIssue({
        prefix: split.before,
        suffix: split.after,
        answer: item.answer,
        sourceWord: item.sourceWord,
        needsSourceWord,
      })
    ) {
      return false;
    }

    if (
      !hasEnoughPreAnswerContext({
        prefix: split.before,
        suffix: split.after,
        sourceWord: item.sourceWord,
        needsSourceWord,
        hint: item.hint ?? "",
      })
    ) {
      return false;
    }

    const canonical = buildCanonicalCompletedSentence({
      prefix: item.prefix ?? split.before,
      suffix: item.suffix ?? split.after,
      answer: item.answer,
    });
    if (item.completedSentence?.trim()) {
      const stored = normalize(item.completedSentence);
      // Stored reveal must place the graded answer exactly once.
      if (countWholeTokens(stored, item.answer) !== 1) return false;
      // Prefer rejecting divergent reveals that would confuse feedback.
      if (
        normalizeAnswerKey(stored) !== normalizeAnswerKey(canonical) &&
        !stored.includes(item.answer)
      ) {
        return false;
      }
    }

    if (
      isVagueExplanation({
        explanation: item.explanation,
        learningObjective: item.learningObjective,
        skillLabel: item.skillLabel,
        sourceWord: item.sourceWord,
        answer: item.answer,
      })
    ) {
      return false;
    }

    if (
      instructionUnanswerable({
        instruction: item.instruction,
        learningObjective: item.learningObjective,
        needsSourceWord,
        sourceWord: item.sourceWord,
      })
    ) {
      return false;
    }

    // Inserting the graded answer must rebuild the canonical completed sentence.
    if (
      normalizeAnswerKey(canonical) !==
      normalizeAnswerKey(
        buildCanonicalCompletedSentence({
          prefix: split.before,
          suffix: split.after,
          answer: item.answer,
        }),
      )
    ) {
      return false;
    }

    return true;
  }
  if (item.type === "transformation") {
    if (!item.promptWord.trim() || !item.answer.trim()) return false;
    if (normalizeAnswerKey(item.promptWord) === normalizeAnswerKey(item.answer)) {
      return false;
    }
    if (looksLikeMetaLabel(item.answer)) return false;
    if (!isRelatedWordForm(item.promptWord, item.answer)) return false;
    if (hintLeaksAnswer(item.hint ?? "", item.answer)) return false;
    if (
      isVagueExplanation({
        explanation: item.explanation,
        learningObjective: item.learningObjective,
        skillLabel: item.skillLabel,
        sourceWord: item.promptWord,
        answer: item.answer,
      })
    ) {
      return false;
    }
    return item.acceptedAnswers.length > 0;
  }
  if (item.type === "multiple_choice") {
    if (item.options.length < 2) return false;
    if (!item.options.includes(item.correctOption)) return false;
    if (looksLikeMetaLabel(item.correctOption)) return false;
    if (item.options.some(looksLikeMetaLabel)) return false;
    if (hintLeaksAnswer(item.hint ?? "", item.correctOption)) return false;
    // Prompt must give enough to choose without guessing.
    if (letterTokens(item.prompt).length < 3) return false;
    return true;
  }
  return false;
}

export function revealTextForExercise(item: TheoryExercise): string {
  if (item.type === "fill_blank") {
    const canonical = buildCanonicalCompletedSentence({
      prefix: item.prefix,
      suffix: item.suffix,
      answer: item.answer,
      sentence: item.sentence,
    });
    // Prefer the same sentence the learner sees filled — avoids feedback that
    // looks identical to a rejected answer while grading a different string.
    if (item.sourceWord?.trim()) {
      return `${item.sourceWord.trim()} → ${item.answer}`;
    }
    return item.completedSentence?.trim() || canonical;
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

export type MapAiDraftsOptions = {
  studyLanguage?: string;
  exampleLexemes?: readonly string[];
  /** When provided, overrides draft.materialSource for example-reuse accounting. */
  material?: Pick<TheoryGenerationMaterial, "exampleLexemes">;
};

function theoryHintFields(
  draft: TheoryAiExerciseDraft,
  answers: string[],
  grounding: string,
  legacyHint = draft.hint,
) {
  const hints = resolveProgressiveHints({
    raw: draft.hints,
    legacyHint,
    answers,
    grounding,
  });
  const scrubbedLegacy = legacyHint.trim();
  const hint =
    scrubbedLegacy &&
    !hintLeaksAnswer(scrubbedLegacy, answers[0] ?? "") &&
    hints.includes(scrubbedLegacy)
      ? scrubbedLegacy
      : (hints[0] ?? "");
  return { hint, hints: hints.length > 0 ? hints : hint ? [hint] : [] };
}

export function mapAiDraftsToTheoryExercises(
  theoryId: string,
  drafts: TheoryAiExerciseDraft[],
  fallbackSkill?: string,
  maxItems = 30,
  studyLanguageOrOptions?: string | MapAiDraftsOptions,
): TheoryExercise[] {
  const options: MapAiDraftsOptions =
    typeof studyLanguageOrOptions === "string" || studyLanguageOrOptions == null
      ? { studyLanguage: studyLanguageOrOptions }
      : studyLanguageOrOptions;
  const studyLanguage = options.studyLanguage;
  const exampleLexemes =
    options.exampleLexemes ?? options.material?.exampleLexemes ?? [];

  const items: TheoryExercise[] = [];
  const skill = fallbackSkill?.trim() || undefined;

  for (const draft of drafts) {
    const skillLabel = draft.skillLabel ?? skill;
    const hint = draft.hint.trim();
    const explanation = draft.explanation?.trim() || undefined;
    const learningObjective = draft.learningObjective.trim();
    const targetType = draft.targetType;
    const completedSentence = draft.completedSentence?.trim() || undefined;
    let sourceWord = draft.sourceWord?.trim() || draft.promptWord?.trim() || undefined;

    const needsSourceWord =
      targetType === "suffix" ||
      targetType === "prefix" ||
      targetType === "word_form";

    if (draft.type === "fill_blank" && draft.answer) {
      let answerText = resolveFullWordAnswer({
        answer: draft.answer,
        sourceWord,
        completedSentence,
      });
      if (!answerText) continue;

      // Prefer complete-sentence → blank so graded answer and reveal stay aligned.
      let sentence = "";
      let split: { before: string; after: string } | null = null;
      const fromComplete =
        completedSentence != null
          ? blankAnswerFromCompletedSentence(completedSentence, answerText)
          : null;

      if (fromComplete) {
        answerText = fromComplete.answer;
        sentence = forceFullWordBlank(fromComplete.sentence);
        split = {
          before: fromComplete.prefix,
          after: fromComplete.suffix,
        };
      } else if (draft.sentence) {
        sentence = forceFullWordBlank(draft.sentence);
        split = splitSentenceBlank(sentence);
      } else {
        continue;
      }

      if (!split || !isFullWordBlank(sentence)) continue;
      if (isWrongStudyLanguageSentence(sentence, studyLanguage)) continue;

      // Parenthesis cue: required for form practice; must be the base, not the answer.
      if (
        sourceWord &&
        normalizeAnswerKey(sourceWord) === normalizeAnswerKey(answerText)
      ) {
        if (needsSourceWord) continue;
        sourceWord = undefined;
      }

      const scrubbed = scrubFillBlankPresentation({
        prefix: split.before,
        suffix: split.after,
        answer: answerText,
        hint,
        spaced: true,
        sourceWord,
      });
      if (!isFullWordBlank(scrubbed.sentence)) continue;
      if (isWrongStudyLanguageSentence(scrubbed.sentence, studyLanguage)) continue;
      const hintsForItem = theoryHintFields(
        draft,
        [answerText, ...(draft.acceptedAnswers ?? [])],
        learningObjective,
        scrubbed.hint,
      );
      if (!hintsForItem.hint || hintLeaksAnswer(hintsForItem.hint, answerText)) {
        continue;
      }

      const resolvedSourceWord = sourceWord || scrubbed.sourceWordCue;
      if (needsSourceWord && !resolvedSourceWord) continue;

      if (
        hasObjectiveAlignmentIssue({
          prefix: scrubbed.prefix,
          suffix: scrubbed.suffix,
          answer: answerText,
          sourceWord: resolvedSourceWord,
          needsSourceWord,
        })
      ) {
        continue;
      }

      if (
        !hasEnoughPreAnswerContext({
          prefix: scrubbed.prefix,
          suffix: scrubbed.suffix,
          sourceWord: resolvedSourceWord,
          needsSourceWord,
          hint: hintsForItem.hint,
        })
      ) {
        continue;
      }

      const canonicalCompleted = scrubbed.completedSentence;
      const materialSource = draft.materialSource ?? "ai";

      const fill: TheoryFillBlankExercise = {
        id: uid("ai_fill"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource,
        skillLabel,
        instruction: draft.instruction?.trim() || undefined,
        sentence: scrubbed.sentence,
        answer: answerText,
        acceptedAnswers: uniqueAnswers(answerText, draft.acceptedAnswers ?? []),
        hint: hintsForItem.hint,
        hints: hintsForItem.hints,
        explanation,
        learningObjective,
        targetType: effectiveTargetType(targetType, Boolean(resolvedSourceWord)),
        sourceWord: resolvedSourceWord,
        // Always store the canonical rebuild so feedback matches grading.
        completedSentence: canonicalCompleted,
        sentenceMeaning: draft.sentenceMeaning?.trim() || undefined,
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
      if (!isRelatedWordForm(promptWord, answerText)) continue;
      const hintsForItem = theoryHintFields(
        draft,
        [answerText, ...(draft.acceptedAnswers ?? [])],
        learningObjective,
      );
      if (!hintsForItem.hint || hintLeaksAnswer(hintsForItem.hint, answerText)) {
        continue;
      }

      const accepted = uniqueAnswers(answerText, draft.acceptedAnswers ?? []);
      const xf: TheoryTransformationExercise = {
        id: uid("ai_xf"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "transformation",
        typeLabelKey: "transformation",
        materialSource: draft.materialSource ?? "ai",
        skillLabel,
        instruction: draft.instruction?.trim() || undefined,
        promptWord,
        answer: answerText,
        acceptedAnswers: accepted,
        showArrow: draft.showArrow !== false,
        hint: hintsForItem.hint,
        hints: hintsForItem.hints,
        explanation,
        learningObjective,
        targetType: effectiveTargetType(targetType, true),
        completedSentence: `${promptWord} → ${answerText}`,
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
      const hintsForItem = theoryHintFields(
        draft,
        [draft.correctOption, ...(draft.acceptedAnswers ?? [])],
        learningObjective,
      );
      if (
        !hintsForItem.hint ||
        hintLeaksAnswer(hintsForItem.hint, draft.correctOption)
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
        materialSource: draft.materialSource ?? "ai",
        skillLabel,
        instruction: draft.instruction?.trim() || undefined,
        prompt: draft.prompt,
        options: draft.options,
        correctOption: draft.correctOption,
        acceptedAnswers: accepted,
        hint: hintsForItem.hint,
        hints: hintsForItem.hints,
        explanation,
        learningObjective,
        targetType,
        completedSentence: undefined,
      };
      if (isValidTheoryExercise(mc)) items.push(mc);
    }
  }

  const preferred = [
    ...items.filter((i) => i.type !== "multiple_choice"),
    ...items.filter((i) => i.type === "multiple_choice"),
  ];

  const deduped = dedupeTheoryExercises(preferred, maxItems);
  return enforceExampleReuseLimit(deduped, exampleLexemes, maxItems);
}

/**
 * Re-apply structural validation to persisted/cached exercises so old
 * malformed items cannot bypass the corrected checks.
 */
export function filterPersistedTheoryExercises(
  items: TheoryExercise[],
): TheoryExercise[] {
  return items.filter((item) => isValidTheoryExercise(item));
}
