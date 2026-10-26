/**
 * Pre-generated progressive hints for vocabulary and theory questions.
 * Reveal uses these strings as-is — no extra model call.
 *
 * For typed fill-in / type-answer modes, Hint 2 is a deterministic spelling
 * mask derived from the canonical answer (never invented by the model).
 */

import {
  isSpellingMaskHint,
  partialAnswerHint,
} from "@/lib/exercises/hint";

export const MAX_PROGRESSIVE_HINTS = 3;

/** Append a spelling-mask hint for fill-in / typed-answer exercises. */
export type ProgressiveHintMode = "standard" | "spelling-progressive";

export const PROGRESSIVE_HINT_PROMPT = `Progressive hints (Hint 1 — grammar / structure only):
Return "hints" as exactly 1 short string in explanationLanguage (an optional second grammar-only follow-up is allowed only for a submittedMistake).
Hint 1 MUST name a concrete grammatical or morphological fact about THIS blank and THIS expected surface form, such as:
- the case / tense / mood / voice / polarity required by the clause
- a required ending, particle, or stem change (you may cite the affix pattern in the study language, e.g. "-sta/-stä", without writing the full answer)
- agreement (person, number) forced by a nearby word
- why the dictionary/lemma form would be wrong in this slot
Do NOT restate, translate, or paraphrase the vocabulary meaning / gloss already shown next to the blank.
Do NOT write vague coaching: "use surrounding words", "think about context", "connect the blank to this idea", "keep the same idea", or similar.
Write the instruction in explanationLanguage; keep study-language affixes/terms when useful.
Difficulty (hintDifficulty): easy may name the construction plainly; medium balanced; hard/intensive more indirect but still specific — never empty of grammar content.
NEVER include the full answer, a meaning that equals the answer, a masked spelling, first letter, "starts with", or letter-count clue — the app adds a separate spelling hint.
If you cannot ground a grammar clue, return "hints": [].`;

export function progressiveHintPayload(input: {
  explanationLanguage: string;
  difficulty?: string | null;
  submittedMistake?: string | null;
}) {
  const mistake = input.submittedMistake?.trim() || null;
  return {
    explanationLanguage: input.explanationLanguage,
    hintDifficulty: input.difficulty?.trim() || "medium",
    submittedMistake: mistake,
  };
}

function compact(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number) {
  const text = compact(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function hintRevealsAnswer(hint: string, answer: string) {
  const left = compact(hint).toLocaleLowerCase();
  const right = compact(answer).toLocaleLowerCase();
  if (!left || right.length < 2) return false;
  if (left === right) return true;
  // Spelling masks are intentional partial reveals — not full answers.
  if (left.includes("_") && left !== right) return false;
  const escaped = right.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
    "iu",
  ).test(left);
}

export function isLetterClue(hint: string, answers: readonly string[]) {
  const text = compact(hint);
  if (!text) return false;
  if (isSpellingMaskHint(text, answers)) return false;
  if (/^starts with\b/iu.test(text)) return true;
  if (/^first letter\b/iu.test(text)) return true;
  if (/^\p{L}$/u.test(text)) return true;
  for (const answer of answers) {
    const letter = [...compact(answer)][0];
    if (!letter) continue;
    if (text.toLocaleLowerCase() === letter.toLocaleLowerCase()) return true;
  }
  return false;
}

/** Drop hints that only restate a meaning already visible beside the blank. */
export function hintRestatesVisibleMeaning(
  hint: string,
  visibleMeaning: string | null | undefined,
) {
  const meaning = compact(visibleMeaning ?? "");
  if (!meaning || meaning.length < 2) return false;
  const text = compact(hint).toLocaleLowerCase();
  const key = meaning.toLocaleLowerCase();
  if (text === key) return true;
  if (text.includes(`: ${key}`) || text.includes(`: ${key}.`)) return true;
  if (text.includes(`idea: ${key}`)) return true;
  if (text.includes(`“${key}”`) || text.includes(`"${key}"`)) return true;
  // Meaning is the main payload of a short coaching sentence.
  if (key.length >= 3 && text.includes(key) && text.length <= key.length + 80) {
    return true;
  }
  return false;
}

const GENERIC_ADVICE =
  /\b(use the words around the blank|keep the same idea|look at the (sentence|context)|think about the context|do not change the meaning to force|connect the blank to this idea|the sentence is asking for this idea|notice how this sentence uses this idea)\b/iu;

export function isGenericAdviceHint(hint: string) {
  return GENERIC_ADVICE.test(compact(hint));
}

export function sanitizeProgressiveHints(
  hints: readonly string[],
  answers: readonly string[],
  options?: {
    visibleMeaning?: string | null;
    allowSpellingMasks?: boolean;
  },
) {
  const cleaned: string[] = [];
  const allowMasks = options?.allowSpellingMasks ?? false;
  for (const hint of hints) {
    const text = compact(hint);
    if (!text) continue;
    if (isGenericAdviceHint(text)) continue;
    if (
      options?.visibleMeaning &&
      hintRestatesVisibleMeaning(text, options.visibleMeaning)
    ) {
      continue;
    }
    const isMask = isSpellingMaskHint(text, answers);
    if (isMask && !allowMasks) continue;
    if (!isMask && isLetterClue(text, answers)) continue;
    if (
      !isMask &&
      answers.some((answer) => hintRevealsAnswer(text, answer))
    ) {
      continue;
    }
    if (
      cleaned.some(
        (existing) => existing.toLocaleLowerCase() === text.toLocaleLowerCase(),
      )
    ) {
      continue;
    }
    cleaned.push(text);
    if (cleaned.length >= MAX_PROGRESSIVE_HINTS) break;
  }
  return cleaned;
}

/**
 * Build a concrete Hint 1 from lemma vs surface form when AI/store lacks one.
 * Never embeds the full answer; may cite a short ending pattern.
 */
export function morphologyHintFromForms(input: {
  lemma?: string | null;
  answer?: string | null;
  difficulty?: string | null;
}) {
  const lemma = compact(input.lemma ?? "");
  const answer = compact(input.answer ?? "");
  if (!answer) return null;

  const level = input.difficulty?.trim().toLowerCase();
  const easy = level === "easy";
  const hard = level === "hard" || level === "intensive";

  if (lemma && lemma.toLocaleLowerCase() !== answer.toLocaleLowerCase()) {
    // Shared prefix length (Unicode-aware) to describe stem vs ending.
    const lemmaChars = [...lemma];
    const answerChars = [...answer];
    let shared = 0;
    while (
      shared < lemmaChars.length &&
      shared < answerChars.length &&
      lemmaChars[shared]!.toLocaleLowerCase() ===
        answerChars[shared]!.toLocaleLowerCase()
    ) {
      shared += 1;
    }
    // Prefer a short suffix cue when the ending is clearly affix-like.
    // Never cite a long remnant that would nearly spell the answer.
    const suffixChars = answerChars.slice(shared);
    const suffix = suffixChars.join("");
    const safeSuffix =
      suffix.length >= 1 &&
      suffix.length <= 4 &&
      shared >= 2 &&
      suffix.length <= Math.floor(answerChars.length / 2);
    if (safeSuffix) {
      if (easy) {
        return `This slot needs an inflected form — try the ending “${suffix}”, not the dictionary form.`;
      }
      if (hard) {
        return `The lemma alone does not fit here; the clause forces a different ending (pattern like “…${suffix}”).`;
      }
      return `Use an inflected surface form here (ending pattern “${suffix}”), not the saved lemma.`;
    }
    if (answer.length < lemma.length && shared >= 2) {
      return easy
        ? "This blank wants a shorter/stem-changed form of the word, not the full dictionary form."
        : "Watch for a stem change or truncated form required by the construction — the lemma is not enough.";
    }
    return easy
      ? "Fill the blank with the form required by the grammar of this sentence, not the dictionary lemma."
      : hard
        ? "The clause licenses a different morphological shape than the saved lemma."
        : "Match the morphology the clause requires; the dictionary form is the wrong shape for this blank.";
  }

  if (lemma && lemma.toLocaleLowerCase() === answer.toLocaleLowerCase()) {
    return easy
      ? "Here the blank keeps the dictionary form — no extra ending is needed."
      : "This slot takes the lemma form as written; do not add an inflection the sentence does not license.";
  }

  // No lemma available — still avoid meaning restatement.
  return easy
    ? "Check the grammatical form this blank needs (case, tense, mood, or polarity) before typing."
    : hard
      ? "Identify the construction that licenses this blank (agreement, stem change, or required ending)."
      : "Focus on the form the sentence structure requires (ending, stem, or polarity).";
}

export function fallbackProgressiveHints(input: {
  grounding?: string | null;
  difficulty?: string | null;
  submittedMistake?: string | null;
  answers?: readonly string[];
  visibleMeaning?: string | null;
  mode?: ProgressiveHintMode;
  lemma?: string | null;
  spellingAnswer?: string | null;
}) {
  const answers = input.answers ?? [];
  const mode = input.mode ?? "standard";
  const visible = compact(input.visibleMeaning ?? "");
  const grounding = compact(input.grounding ?? "");
  const groundingIsVisible =
    Boolean(visible) &&
    Boolean(grounding) &&
    grounding.toLocaleLowerCase() === visible.toLocaleLowerCase();

  const hints: string[] = [];

  if (mode === "spelling-progressive") {
    const morph = morphologyHintFromForms({
      lemma: input.lemma,
      answer: input.spellingAnswer ?? answers[0] ?? null,
      difficulty: input.difficulty,
    });
    if (morph) hints.push(morph);
  } else if (grounding && !groundingIsVisible) {
    if (!answers.some((answer) => hintRevealsAnswer(grounding, answer))) {
      const idea = clip(grounding, 160);
      const difficulty = input.difficulty?.trim().toLowerCase();
      hints.push(
        difficulty === "easy"
          ? `The sentence is asking for this idea: ${idea}. Choose the form that expresses it here.`
          : difficulty === "hard" || difficulty === "intensive"
            ? `Notice how this sentence uses this idea before you decide: ${idea}.`
            : `Connect the blank to this idea: ${idea}.`,
      );
    }
  } else {
    const morph = morphologyHintFromForms({
      lemma: input.lemma,
      answer: input.spellingAnswer ?? answers[0] ?? null,
      difficulty: input.difficulty,
    });
    if (morph) hints.push(morph);
  }

  const mistake = compact(input.submittedMistake ?? "");
  if (
    mistake &&
    !answers.some((answer) => hintRevealsAnswer(mistake, answer)) &&
    !(grounding && hintRevealsAnswer(mistake, grounding))
  ) {
    hints.push(
      `The attempt “${clip(mistake, 80)}” does not fit the form this slot needs. Recheck ending, stem, or polarity.`,
    );
  }

  return sanitizeProgressiveHints(hints, answers, {
    visibleMeaning: input.visibleMeaning,
    allowSpellingMasks: false,
  });
}

function appendSpellingHint(
  hints: string[],
  answers: readonly string[],
  spellingAnswer?: string | null,
) {
  const canonical =
    compact(spellingAnswer ?? "") ||
    answers.map((item) => compact(item)).find(Boolean) ||
    "";
  if (!canonical) return hints;

  const mask = partialAnswerHint(canonical);
  if (!mask) return hints;
  if (mask.toLocaleLowerCase() === canonical.toLocaleLowerCase()) return hints;
  if (hintRevealsAnswer(mask, canonical) && !mask.includes("_")) return hints;

  const withoutMasks = hints.filter(
    (hint) => !isSpellingMaskHint(hint, answers) && !hint.includes("_"),
  );
  const room = Math.max(0, MAX_PROGRESSIVE_HINTS - 1);
  return sanitizeProgressiveHints(
    [...withoutMasks.slice(0, room), mask],
    answers,
    {
      allowSpellingMasks: true,
    },
  );
}

export function resolveProgressiveHints(input: {
  raw?: readonly string[] | null;
  legacyHint?: string | null;
  answers: readonly string[];
  grounding?: string | null;
  difficulty?: string | null;
  submittedMistake?: string | null;
  mode?: ProgressiveHintMode;
  visibleMeaning?: string | null;
  /** Canonical accepted answer used for Hint 2 spelling mask. */
  spellingAnswer?: string | null;
  /** Dictionary/lemma form for morphology-aware Hint 1 fallback. */
  lemma?: string | null;
}) {
  const mode = input.mode ?? "standard";
  const allowSpelling = mode === "spelling-progressive";
  const sanitizeOpts = {
    visibleMeaning: input.visibleMeaning,
    allowSpellingMasks: allowSpelling,
  };

  const raw = [...(input.raw ?? [])];
  if (input.legacyHint?.trim()) raw.push(input.legacyHint);
  let stored = sanitizeProgressiveHints(raw, input.answers, sanitizeOpts);

  // Prefer a morphology fallback as Hint 1 when every stored hint was dropped
  // (e.g. old meaning-restating AI strings) or when none were stored.
  if (stored.length === 0) {
    stored = fallbackProgressiveHints({
      grounding: input.grounding,
      difficulty: input.difficulty,
      submittedMistake: input.submittedMistake,
      answers: input.answers,
      visibleMeaning: input.visibleMeaning,
      mode,
      lemma: input.lemma,
      spellingAnswer: input.spellingAnswer,
    });
  } else if (
    input.submittedMistake?.trim() &&
    stored.length < MAX_PROGRESSIVE_HINTS
  ) {
    const withMistake = fallbackProgressiveHints({
      grounding: input.grounding,
      difficulty: input.difficulty,
      submittedMistake: input.submittedMistake,
      answers: input.answers,
      visibleMeaning: input.visibleMeaning,
      mode,
      lemma: input.lemma,
      spellingAnswer: input.spellingAnswer,
    }).filter(
      (hint) =>
        !stored.some(
          (existing) =>
            existing.toLocaleLowerCase() === hint.toLocaleLowerCase(),
        ),
    );
    stored = sanitizeProgressiveHints(
      [...stored, ...withMistake],
      input.answers,
      sanitizeOpts,
    );
  }

  // If stored AI hints exist but look like weak meaning coaching that slipped
  // through, and we have a stronger morphology line, prefer morphology first.
  if (allowSpelling && stored.length > 0) {
    const morph = morphologyHintFromForms({
      lemma: input.lemma,
      answer: input.spellingAnswer ?? input.answers[0] ?? null,
      difficulty: input.difficulty,
    });
    const first = stored[0] ?? "";
    const firstIsWeak =
      isGenericAdviceHint(first) ||
      hintRestatesVisibleMeaning(first, input.visibleMeaning) ||
      /\b(idea|meaning|gloss|translation)\b/iu.test(first);
    if (morph && firstIsWeak) {
      stored = sanitizeProgressiveHints(
        [morph, ...stored.filter((h) => h !== first)],
        input.answers,
        sanitizeOpts,
      );
    }
  }

  if (allowSpelling) {
    return appendSpellingHint(
      stored,
      input.answers,
      input.spellingAnswer ?? input.answers[0] ?? null,
    );
  }
  return stored.slice(0, MAX_PROGRESSIVE_HINTS);
}
