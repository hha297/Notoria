/**
 * Pre-generated progressive hints for vocabulary and theory questions.
 * Reveal uses these strings as-is — no extra model call.
 *
 * Hint *strategy* depends on the exercise learning objective:
 * - vocabulary-meaning: association clues (never dictionary paraphrases)
 * - grammar-form: morphology / structure for blanks and contextual forms
 * - theory-rule: grammatical rules and learning objectives
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

/**
 * Which learning objective the hint must serve.
 * Do not reuse grammar-form fallbacks for vocabulary meaning quizzes.
 */
export type ProgressiveHintStrategy =
  | "vocabulary-meaning"
  | "grammar-form"
  | "theory-rule";

/** @deprecated Prefer GRAMMAR_FORM_HINT_PROMPT or progressiveHintPromptFor(). */
export const PROGRESSIVE_HINT_PROMPT = `Progressive hints (Hint 1 — grammar / structure only):
Return "hints" as exactly 1 short string in explanationLanguage (an optional second grammar-only follow-up is allowed only for a submittedMistake).
Hint 1 MUST name a concrete grammatical or morphological fact about THIS blank and THIS expected surface form, such as:
- the case / tense / mood / voice / polarity required by the clause
- a required ending, particle, or stem change (you may cite the affix pattern in the study language, e.g. "-sta/-stä", without writing the full answer)
- agreement (person, number) forced by a nearby word
- why the dictionary/lemma form would be wrong in this slot
- a relevant collocation or structural cue from the surrounding words
Do NOT restate, translate, or paraphrase the vocabulary meaning / gloss already shown next to the blank.
Do NOT write vague coaching: "use surrounding words", "think about context", "connect the blank to this idea", "keep the same idea", or similar.
Write the instruction in explanationLanguage; keep study-language affixes/terms when useful.
Difficulty (hintDifficulty): easy may name the construction plainly; medium balanced; hard/intensive more indirect but still specific — never empty of grammar content.
NEVER include the full answer, a meaning that equals the answer, a masked spelling, first letter, "starts with", or letter-count clue — the app adds a separate spelling hint.
If you cannot ground a grammar clue, return "hints": [].`;

export const GRAMMAR_FORM_HINT_PROMPT = PROGRESSIVE_HINT_PROMPT;

export const VOCABULARY_MEANING_HINT_PROMPT = `Progressive hints (Hint 1 — vocabulary usage clue only):
Return "hints" as exactly 1 short string in explanationLanguage.
This is a vocabulary meaning / translation multiple-choice item.

Write the hint as a concrete usage clue: what this word is for in real life.
Good shape: a short description of the situation, purpose, action, role, or communicative job the word covers — so the learner can match that use to one option.

Internally evaluate (do NOT output this reasoning):
1. Question direction (word→meaning or meaning→word) and the exact sense being tested.
2. The correct option and why each distractor is wrong.
3. A usage clue that makes the correct option recognizable without naming it.

Preferred hint style examples (do not copy wording; invent for THIS item):
- Verb: "What people do with games, sports, toys, or an instrument."
- Verb: "When something valuable slips away or gets squandered."
- Adverb: "Pushing back against what was just claimed."
- Noun: "The place where you sleep in a house."
- Adjective: "How someone feels after resting well."

Hint requirements:
- Lead with usage / purpose / situation — not abstract coaching.
- Tune to partOfSpeech when provided (action, thing/role, quality, stance, link between ideas).
- Use the specific sense being tested when the word is polysemous.
- Keep one concise natural sentence (two only if needed).
- Avoid empty templates: "Picture the action…", "Think about…", "Consider…", "Remember that…", "Connect the target…", "Match the option…".
- Do NOT paste a dictionary gloss, direct translation, or near-paraphrase of the correct option.
- Do NOT name the correct option or any distractor label.
- Do NOT give grammar/morphology advice (endings, stems, polarity, conjugation).
- NEVER include the full answer, a masked spelling, first letter, or "starts with" clue.
If a safe usage clue is impossible, return "hints": [].`;

export const THEORY_RULE_HINT_PROMPT = `Progressive hints (Hint 1 — theory / grammar rule only):
Return "hints" as exactly 1 short string in explanationLanguage (an optional second rule-focused follow-up is allowed only for a submittedMistake).
Guide the learner toward the Theory rule without stating the answer token.
Focus on: the relevant grammatical rule, case/tense/mood/agreement signals, sentence structure, word order, or the distinction the Theory is teaching.
Do NOT reveal the answer form, paraphrase it, or give letter/spelling clues.
Do NOT give unrelated vocabulary-definition coaching.
Write in explanationLanguage; keep study-language grammatical terms when useful.
If you cannot ground a rule clue, return "hints": [].`;

export function progressiveHintPromptFor(
  strategy: ProgressiveHintStrategy,
): string {
  if (strategy === "vocabulary-meaning") return VOCABULARY_MEANING_HINT_PROMPT;
  if (strategy === "theory-rule") return THEORY_RULE_HINT_PROMPT;
  return GRAMMAR_FORM_HINT_PROMPT;
}

export function progressiveHintPayload(input: {
  explanationLanguage: string;
  difficulty?: string | null;
  submittedMistake?: string | null;
  strategy?: ProgressiveHintStrategy;
}) {
  const mistake = input.submittedMistake?.trim() || null;
  return {
    explanationLanguage: input.explanationLanguage,
    hintDifficulty: input.difficulty?.trim() || "medium",
    hintStrategy: input.strategy ?? "grammar-form",
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

/** Grammar/morphology coaching that must never appear on vocabulary-meaning items. */
const GRAMMAR_FORM_COACHING =
  /\b(ending|stem|polarity|inflect|inflection|lemma|morpholog|conjugat|case ending|dictionary form|grammatical form|sentence structure requires)\b/iu;

export function isGenericAdviceHint(hint: string) {
  return GENERIC_ADVICE.test(compact(hint));
}

export function isGrammarFormCoachingHint(hint: string) {
  return GRAMMAR_FORM_COACHING.test(compact(hint));
}

export function sanitizeProgressiveHints(
  hints: readonly string[],
  answers: readonly string[],
  options?: {
    visibleMeaning?: string | null;
    allowSpellingMasks?: boolean;
    strategy?: ProgressiveHintStrategy;
  },
) {
  const cleaned: string[] = [];
  const allowMasks = options?.allowSpellingMasks ?? false;
  const strategy = options?.strategy ?? "grammar-form";
  for (const hint of hints) {
    const text = compact(hint);
    if (!text) continue;
    if (isGenericAdviceHint(text)) continue;
    if (
      strategy === "vocabulary-meaning" &&
      isGrammarFormCoachingHint(text)
    ) {
      continue;
    }
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

function distractorUsageBucket(text: string): string {
  const t = compact(text).toLocaleLowerCase();
  if (
    /\b(uncle|aunt|mother|father|brother|sister|parent|cousin|friend|person|people|man|woman|boy|girl|teacher|doctor)\b/u.test(
      t,
    )
  ) {
    return "a person or relationship";
  }
  if (
    /\b(loud|quiet|noisy|silent|soft|volume|sound|bright|dark|color|colour)\b/u.test(
      t,
    )
  ) {
    return "a sound, look, or intensity";
  }
  if (
    /\b(look forward|hope|expect|wait|afraid|happy|sad|angry|love|hate|feel)\b/u.test(
      t,
    )
  ) {
    return "a feeling or expectation";
  }
  if (
    /\b(house|home|room|city|place|school|table|book|car|food|water)\b/u.test(t)
  ) {
    return "a thing or place";
  }
  if (
    /\b(and|or|but|because|if|when|while|although|however|therefore)\b/u.test(t)
  ) {
    return "a link between clauses";
  }
  if (
    /\b(how|why|when|where|what|who|consistent|contrary|instead|also|very)\b/u.test(
      t,
    )
  ) {
    return "a different framing word";
  }
  if (/^to\s+/u.test(t) || t.split(/\s+/).length >= 2) {
    return "another action or idea";
  }
  return "a different kind of meaning";
}

/**
 * Local usage-oriented vocabulary hint when AI hints are missing.
 * Prefers "what this word is for" + distractor contrast; never embeds option text.
 */
export function vocabularyMeaningFallbackHint(input: {
  partOfSpeech?: string | null;
  direction?: "WORD_TO_MEANING" | "MEANING_TO_WORD" | string | null;
  answers?: readonly string[];
  correctOption?: string | null;
  options?: readonly string[];
}) {
  const pos = compact(input.partOfSpeech ?? "").toLocaleLowerCase();
  const toWord =
    input.direction === "MEANING_TO_WORD" ||
    input.direction === "meaning-to-word";
  const correct =
    compact(input.correctOption ?? "") ||
    compact(input.answers?.[0] ?? "");
  const optionPool =
    input.options && input.options.length > 0
      ? input.options.map(compact).filter(Boolean)
      : (input.answers ?? []).map(compact).filter(Boolean);
  const leakTargets = Array.from(
    new Set([correct, ...optionPool].filter(Boolean)),
  );
  const distractors = optionPool.filter(
    (option) =>
      option &&
      option.toLocaleLowerCase() !== correct.toLocaleLowerCase(),
  );

  const buckets = Array.from(
    new Set(distractors.map(distractorUsageBucket)),
  ).slice(0, 3);

  const candidates: string[] = [];

  if (buckets.length >= 2) {
    if (/\b(verb|v\.|vb)\b/u.test(pos) || pos === "v" || /^to\s+/iu.test(correct)) {
      candidates.push(
        toWord
          ? `The study-language verb for a concrete everyday action — not ${buckets.join(", not ")}.`
          : `Used for a concrete everyday action or activity — not ${buckets.join(", not ")}.`,
      );
    } else if (/\b(noun|n\.|substant)\b/u.test(pos) || pos === "n") {
      candidates.push(
        toWord
          ? `The study-language word for that everyday thing/role — not ${buckets.join(", not ")}.`
          : `Used to name a thing, place, or role in daily life — not ${buckets.join(", not ")}.`,
      );
    } else if (/\b(adj|adjective)\b/u.test(pos)) {
      candidates.push(
        `Used to describe a quality or condition — not ${buckets.join(", not ")}.`,
      );
    } else if (/\b(adv|adverb)\b/u.test(pos)) {
      candidates.push(
        `Used to frame how a whole statement is meant — not ${buckets.join(", not ")}.`,
      );
    } else if (/\b(conj|conjunction|particle)\b/u.test(pos)) {
      candidates.push(
        `Used for the job of relating two clauses — not ${buckets.join(", not ")}.`,
      );
    } else {
      candidates.push(
        toWord
          ? `The study-language word for this everyday use — not ${buckets.join(", not ")}.`
          : `Used for this everyday sense — not ${buckets.join(", not ")}.`,
      );
    }
  }

  if (/\b(verb|v\.|vb)\b/u.test(pos) || pos === "v" || /^to\s+/iu.test(correct)) {
    candidates.push(
      toWord
        ? "Which study-language verb covers this real-life activity or doing?"
        : "Used for something people do — a real activity, not a person, sound, or feeling label.",
    );
  } else if (/\b(noun|n\.|substant)\b/u.test(pos) || pos === "n") {
    candidates.push(
      "Used to name a concrete thing, place, person-role, or idea in daily life.",
    );
  } else if (/\b(adj|adjective)\b/u.test(pos)) {
    candidates.push(
      "Used to describe how someone or something is — a quality or condition.",
    );
  } else if (/\b(adv|adverb)\b/u.test(pos)) {
    candidates.push(
      "Used to show the speaker’s stance toward the whole statement (contrast, manner, degree).",
    );
  } else if (/\b(conj|conjunction|particle)\b/u.test(pos)) {
    candidates.push(
      "Used for the grammatical job of relating two clauses.",
    );
  } else {
    candidates.push(
      toWord
        ? "Which study-language word is actually used for this everyday sense?"
        : "Used for a specific everyday meaning — pick the option that matches that real-life use.",
    );
  }

  for (const candidate of candidates) {
    if (!leakTargets.some((answer) => hintRevealsAnswer(candidate, answer))) {
      return candidate;
    }
  }
  return null;
}

/** Build a single local usage hint for a vocabulary meaning MC item. */
export function buildLocalVocabularyMeaningHints(input: {
  correctOption: string;
  options: readonly string[];
  partOfSpeech?: string | null;
  direction?: "WORD_TO_MEANING" | "MEANING_TO_WORD" | string | null;
}) {
  const hint = vocabularyMeaningFallbackHint({
    correctOption: input.correctOption,
    options: input.options,
    partOfSpeech: input.partOfSpeech,
    direction: input.direction,
    answers: [input.correctOption, ...input.options],
  });
  return hint ? [hint] : [];
}

export function theoryRuleFallbackHint(input: {
  grounding?: string | null;
  difficulty?: string | null;
}) {
  const grounding = compact(input.grounding ?? "");
  if (!grounding) {
    return "Recall the grammatical rule this item is practicing, then apply it to the form or choice.";
  }
  const idea = clip(grounding, 140);
  const difficulty = input.difficulty?.trim().toLowerCase();
  if (difficulty === "easy") {
    return `Apply this rule: ${idea}`;
  }
  if (difficulty === "hard" || difficulty === "intensive") {
    return `Which structural signal in the item matches this objective: ${idea}?`;
  }
  return `Use the Theory objective to decide: ${idea}`;
}

export function fallbackProgressiveHints(input: {
  grounding?: string | null;
  difficulty?: string | null;
  submittedMistake?: string | null;
  answers?: readonly string[];
  visibleMeaning?: string | null;
  mode?: ProgressiveHintMode;
  strategy?: ProgressiveHintStrategy;
  lemma?: string | null;
  spellingAnswer?: string | null;
  partOfSpeech?: string | null;
  direction?: string | null;
}) {
  const answers = input.answers ?? [];
  const mode = input.mode ?? "standard";
  const strategy = input.strategy ?? "grammar-form";
  const visible = compact(input.visibleMeaning ?? "");
  const grounding = compact(input.grounding ?? "");
  const groundingIsVisible =
    Boolean(visible) &&
    Boolean(grounding) &&
    grounding.toLocaleLowerCase() === visible.toLocaleLowerCase();

  const hints: string[] = [];

  if (strategy === "vocabulary-meaning") {
    const association = vocabularyMeaningFallbackHint({
      partOfSpeech: input.partOfSpeech,
      direction: input.direction,
      answers,
      correctOption: answers[0] ?? null,
      options: answers,
    });
    if (association) hints.push(association);
  } else if (strategy === "theory-rule") {
    const theory = theoryRuleFallbackHint({
      grounding: groundingIsVisible ? null : grounding,
      difficulty: input.difficulty,
    });
    if (
      theory &&
      !answers.some((answer) => hintRevealsAnswer(theory, answer))
    ) {
      hints.push(theory);
    }
  } else if (mode === "spelling-progressive") {
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
    if (strategy === "vocabulary-meaning") {
      hints.push(
        `“${clip(mistake, 80)}” does not match this sense. Re-check which option fits the word’s real use.`,
      );
    } else {
      hints.push(
        `The attempt “${clip(mistake, 80)}” does not fit the form this slot needs. Recheck ending, stem, or polarity.`,
      );
    }
  }

  return sanitizeProgressiveHints(hints, answers, {
    visibleMeaning: input.visibleMeaning,
    allowSpellingMasks: false,
    strategy,
  });
}

function appendSpellingHint(
  hints: string[],
  answers: readonly string[],
  spellingAnswer?: string | null,
  strategy?: ProgressiveHintStrategy,
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
      strategy,
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
  strategy?: ProgressiveHintStrategy;
  visibleMeaning?: string | null;
  /** Canonical accepted answer used for Hint 2 spelling mask. */
  spellingAnswer?: string | null;
  /** Dictionary/lemma form for morphology-aware Hint 1 fallback. */
  lemma?: string | null;
  partOfSpeech?: string | null;
  direction?: string | null;
}) {
  const mode = input.mode ?? "standard";
  const strategy = input.strategy ?? "grammar-form";
  const allowSpelling = mode === "spelling-progressive";
  const sanitizeOpts = {
    visibleMeaning: input.visibleMeaning,
    allowSpellingMasks: allowSpelling,
    strategy,
  };

  const raw = [...(input.raw ?? [])];
  if (input.legacyHint?.trim()) raw.push(input.legacyHint);
  let stored = sanitizeProgressiveHints(raw, input.answers, sanitizeOpts);

  // Prefer a strategy-aware fallback as Hint 1 when every stored hint was dropped
  // (e.g. old meaning-restating AI strings) or when none were stored.
  if (stored.length === 0) {
    stored = fallbackProgressiveHints({
      grounding: input.grounding,
      difficulty: input.difficulty,
      submittedMistake: input.submittedMistake,
      answers: input.answers,
      visibleMeaning: input.visibleMeaning,
      mode,
      strategy,
      lemma: input.lemma,
      spellingAnswer: input.spellingAnswer,
      partOfSpeech: input.partOfSpeech,
      direction: input.direction,
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
      strategy,
      lemma: input.lemma,
      spellingAnswer: input.spellingAnswer,
      partOfSpeech: input.partOfSpeech,
      direction: input.direction,
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
  // through on form exercises, and we have a stronger morphology line, prefer it.
  if (allowSpelling && strategy === "grammar-form" && stored.length > 0) {
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

  // Drop leftover grammar coaching on vocabulary-meaning items even if stored.
  if (strategy === "vocabulary-meaning" && stored.length > 0) {
    const withoutGrammar = stored.filter((h) => !isGrammarFormCoachingHint(h));
    if (withoutGrammar.length === 0) {
      stored = fallbackProgressiveHints({
        grounding: input.grounding,
        difficulty: input.difficulty,
        answers: input.answers,
        visibleMeaning: input.visibleMeaning,
        mode,
        strategy,
        partOfSpeech: input.partOfSpeech,
        direction: input.direction,
      });
    } else {
      stored = withoutGrammar;
    }
  }

  if (allowSpelling) {
    return appendSpellingHint(
      stored,
      input.answers,
      input.spellingAnswer ?? input.answers[0] ?? null,
      strategy,
    );
  }
  return stored.slice(0, MAX_PROGRESSIVE_HINTS);
}
