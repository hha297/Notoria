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
  /** Required: what Theory knowledge this item isolates. */
  learningObjective: z.string().min(3).max(240),
  targetType: theoryLearningTargetTypeSchema,
  instruction: z.string().max(200).optional(),
  skillLabel: z.string().max(120).optional(),
  hint: z.string().min(1).max(300),
  explanation: z.string().max(500).optional(),
  materialSource: z.enum(["theory", "vocabulary", "ai"]).optional(),
  // fill_blank
  sentence: z.string().min(1).max(400).optional(),
  answer: z.string().min(1).max(200).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(200)).max(8).optional(),
  sourceWord: z.string().min(1).max(80).optional(),
  /** Full correct sentence after the blank is filled — used for reveal. */
  completedSentence: z.string().min(1).max(400).optional(),
  // transformation
  promptWord: z.string().min(1).max(80).optional(),
  // multiple_choice (sparingly)
  prompt: z.string().min(1).max(400).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
  correctOption: z.string().min(1).max(200).optional(),
});

export const theoryAiResponseSchema = z.object({
  /** Brief summary of what the Theory teaches — forces target-first reasoning. */
  theoryFocus: z.string().min(3).max(400).optional(),
  exercises: z.array(theoryAiExerciseSchema).max(30),
});

export type TheoryAiExerciseDraft = z.infer<typeof theoryAiExerciseSchema>;

const BLANK = "________";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

/** Compare answers; optional leading hyphen on endings is ignored. */
function normalizeAnswerKey(value: string) {
  return normalize(value).replace(/^-/, "").toLowerCase();
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
    // Also accept hyphenated variant for short endings
    if (!value.startsWith("-") && value.length <= 12 && !/\s/.test(value)) {
      const withHyphen = `-${value}`;
      if (!seen.has(normalizeAnswerKey(withHyphen))) {
        // keep primary without hyphen in result; matching strips hyphen
      }
    }
  }
  return result;
}

/**
 * Meta labels / paradigm tables — not concrete practice answers.
 * Single endings like "sta" or "-sta" are allowed when they are the learning target.
 * Alternate lists like "sta/stä" are rejected.
 */
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
  const marker = BLANK;
  const index = sentence.indexOf(marker);
  if (index < 0) return null;
  return {
    before: sentence.slice(0, index),
    after: sentence.slice(index + marker.length),
  };
}

export function answersMatchAny(input: string, accepted: string[]): boolean {
  const normalized = normalizeAnswerKey(input);
  if (!normalized) return false;
  return accepted.some((candidate) => normalizeAnswerKey(candidate) === normalized);
}

function contentKey(item: TheoryExercise): string {
  if (item.type === "fill_blank") {
    // Same ending across different contexts is intentional practice — only drop clones.
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

/**
 * Suffix/prefix fills must keep the stem visible and blank only the target span.
 * Free-standing whole-word blanks (space ________ space) are rejected for suffix/prefix.
 */
function fillTargetsLearningSpan(
  sentence: string,
  answer: string,
  targetType: TheoryLearningTargetType,
): boolean {
  const split = splitSentenceBlank(sentence);
  if (!split) return false;

  if (targetType === "suffix" || targetType === "prefix") {
    // Whole-word gap — not an attached ending/prefix
    if (/(^|\s)________(\s|$)/.test(sentence)) return false;
    if (targetType === "suffix" && /\s$/.test(split.before)) return false;
    if (targetType === "prefix" && /^\s/.test(split.after)) return false;
    if (normalize(answer).split(/\s+/).length > 2) return false;
  }

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
    if (
      !fillTargetsLearningSpan(
        item.sentence.includes(BLANK)
          ? item.sentence
          : `${item.prefix ?? ""}${BLANK}${item.suffix ?? ""}`,
        item.answer,
        item.targetType,
      )
    ) {
      return false;
    }
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
  if (item.completedSentence?.trim()) return item.completedSentence.trim();
  if (item.type === "fill_blank") {
    if (item.sentence.includes(BLANK)) {
      return item.sentence.replace(BLANK, item.answer);
    }
    if (item.prefix) {
      return `${item.prefix}${item.spaced ? " " : ""}${item.answer}${item.suffix ?? ""}`;
    }
    return item.answer;
  }
  if (item.type === "transformation") {
    return `${item.promptWord} → ${item.answer}`;
  }
  return item.correctOption;
}

export function mapAiDraftsToTheoryExercises(
  theoryId: string,
  drafts: TheoryAiExerciseDraft[],
  fallbackSkill?: string,
  maxItems = 30,
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
    const sourceWord = draft.sourceWord?.trim() || undefined;

    if (draft.type === "fill_blank" && draft.sentence && draft.answer) {
      let sentence = draft.sentence.includes(BLANK)
        ? draft.sentence
        : `${draft.sentence.trim()}${BLANK}`;

      // Glue stem + blank for suffix/prefix, but never rewrite a whole-word blank.
      if (targetType === "suffix" && !/(^|\s)________(\s|$)/.test(sentence)) {
        sentence = sentence.replace(/(\S)\s+(________)/, "$1$2");
      }
      if (targetType === "prefix" && !/(^|\s)________(\s|$)/.test(sentence)) {
        sentence = sentence.replace(/(________)\s+(\S)/, "$1$2");
      }

      const split = splitSentenceBlank(sentence);
      const accepted = uniqueAnswers(draft.answer, draft.acceptedAnswers ?? []);
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
        sentence,
        answer: normalize(draft.answer).replace(/^-/, ""),
        acceptedAnswers: accepted,
        hint,
        explanation,
        learningObjective,
        targetType,
        sourceWord,
        completedSentence:
          completedSentence ??
          (split ? `${split.before}${normalize(draft.answer).replace(/^-/, "")}${split.after}` : undefined),
        prefix: split?.before ?? undefined,
        suffix: split?.after.trim() ? split.after : undefined,
        // Suffix/prefix glued to stem; full-word blanks may be spaced
        spaced:
          targetType === "suffix" || targetType === "prefix"
            ? false
            : Boolean(split?.before && /\s$/.test(split.before)),
      };
      if (isValidTheoryExercise(fill)) items.push(fill);
      continue;
    }

    if (draft.type === "transformation" && draft.promptWord && draft.answer) {
      const accepted = uniqueAnswers(draft.answer, draft.acceptedAnswers ?? []);
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
        promptWord: normalize(draft.promptWord),
        answer: normalize(draft.answer).replace(/^-/, ""),
        acceptedAnswers: accepted,
        showArrow: true,
        hint,
        explanation,
        learningObjective,
        targetType,
        completedSentence:
          completedSentence ?? `${normalize(draft.promptWord)} → ${normalize(draft.answer)}`,
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
      const accepted = uniqueAnswers(
        draft.correctOption,
        draft.acceptedAnswers ?? [],
      );
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
