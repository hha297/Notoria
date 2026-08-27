import OpenAI from "openai";
import { ExerciseImportError } from "@/lib/exercise-import/errors";
import {
  instructionGroundedInSource,
  isNeutralInstruction,
  isWriteSentenceTask,
  resolveImportInstruction,
  resolveImportSkillLabel,
} from "@/lib/exercises/exercise-instruction";
import { generateAiTheoryExercises } from "@/lib/theory-exercises/ai";
import {
  mapAiDraftsToTheoryExercises,
  theoryAiExerciseSchema,
  theoryLearningTargetTypeSchema,
  type TheoryAiExerciseDraft,
} from "@/lib/theory-exercises/generate-ai";
import type { TheoryExercise } from "@/lib/theory-exercises/types";
import { plainTextToTheoryDoc } from "@/lib/theory/content";

const IMPORT_MAX_EXERCISES = 60;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ExerciseImportError("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 90_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asTrimmedString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/**
 * Coerce one AI exercise object into a schema-valid draft.
 * Import responses often omit hint/learningObjective or exceed strict limits —
 * repair those instead of failing the entire batch.
 */
export function coerceImportAiDraft(
  raw: unknown,
): TheoryAiExerciseDraft | null {
  if (!isRecord(raw)) return null;

  const type = raw.type;
  if (
    type !== "fill_blank" &&
    type !== "transformation" &&
    type !== "multiple_choice"
  ) {
    return null;
  }

  const instruction = asTrimmedString(raw.instruction, 400);
  const promptWord = asTrimmedString(raw.promptWord, 80);
  const sourceWord = asTrimmedString(raw.sourceWord, 80);
  const learningObjective =
    asTrimmedString(raw.learningObjective, 240) ||
    instruction ||
    promptWord ||
    sourceWord ||
    "Practice";
  const hint =
    asTrimmedString(raw.hint, 300) ||
    instruction ||
    learningObjective ||
    "—";

  const targetParsed = theoryLearningTargetTypeSchema.safeParse(raw.targetType);
  const targetType = targetParsed.success ? targetParsed.data : "word_form";

  const acceptedRaw = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers
    : undefined;
  const optionsRaw = Array.isArray(raw.options) ? raw.options : undefined;

  const acceptedAnswers = acceptedRaw
    ?.map((item) => asTrimmedString(item, 200))
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
  const options = optionsRaw
    ?.map((item) => asTrimmedString(item, 200))
    .filter((item): item is string => Boolean(item))
    .slice(0, 6);

  const candidate = {
    type,
    learningObjective: learningObjective.slice(0, 240),
    targetType,
    instruction,
    skillLabel: asTrimmedString(raw.skillLabel, 120),
    hint: hint.slice(0, 300),
    explanation: asTrimmedString(raw.explanation, 500),
    materialSource:
      raw.materialSource === "vocabulary" || raw.materialSource === "ai"
        ? raw.materialSource
        : "theory",
    sentence: asTrimmedString(raw.sentence, 400),
    answer: asTrimmedString(raw.answer, 200),
    acceptedAnswers:
      acceptedAnswers && acceptedAnswers.length > 0
        ? acceptedAnswers
        : undefined,
    sourceWord,
    completedSentence: asTrimmedString(raw.completedSentence, 400),
    promptWord,
    prompt: asTrimmedString(raw.prompt, 400),
    options: options && options.length >= 2 ? options : undefined,
    correctOption: asTrimmedString(raw.correctOption, 200),
    showArrow: typeof raw.showArrow === "boolean" ? raw.showArrow : undefined,
  };

  const parsed = theoryAiExerciseSchema.safeParse(candidate);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

/**
 * Parse import AI JSON without failing the whole batch on one bad item.
 * Also allows more than Theory's default 30-card cap (worksheets can be dense).
 */
export function parseImportAiExercises(raw: unknown): TheoryAiExerciseDraft[] {
  if (!isRecord(raw)) return [];
  const list = Array.isArray(raw.exercises) ? raw.exercises : [];
  const drafts: TheoryAiExerciseDraft[] = [];
  for (const item of list) {
    const draft = coerceImportAiDraft(item);
    if (draft) drafts.push(draft);
    if (drafts.length >= IMPORT_MAX_EXERCISES) break;
  }
  return drafts;
}

const IMPORT_SOURCE_FIDELITY_PROMPT = `You convert imported learning worksheets into practice cards.

The source text IS the exercise material. You must NOT invent new practice content.

## Absolute fidelity rules
1. Only use cues, prompts, instructions, column headers, and sentences that appear in the source.
2. NEVER invent a new sentence frame (e.g. do not create "Kuulin ________ eilen." if that sentence is not in the source).
3. NEVER invent new vocabulary / paradigm rows. Do not mix cues from different rows.
4. Keep source order (tables top→bottom, lists a→n).
5. Do NOT pad the set to a target count. Output one card per blank/task found in the source (up to ~60). If the source has few items, return few exercises.
6. You MAY compute answer / acceptedAnswers as the correct form of the SAME lexical item when a cell is blank (for grading). That is not inventing practice content.
7. Prefer type "transformation": promptWord = given cue from the source.
8. Use type "fill_blank" ONLY when the source already contains a sentence (or clear cloze line) with a blank. Keep that exact sentence; use ________ for the blank. sourceWord = the given base/cue from the same item if present.
9. Avoid multiple_choice unless the source already presents choices.
10. For open "write a sentence" list items (cue + instruction only): use transformation with promptWord = the cue; set showArrow to false; instruction = the worksheet instruction. Do NOT invent an example sentence.
11. For morphology tables: each ROW is one lexical item. Given one filled cell, create separate transformation cards for each empty target column, using that row's cue as promptWord. Put the column header into instruction together with any worksheet title/instruction from the source. Never use another row's word as the cue.
12. Hints/explanations may briefly clarify the target form; they must not introduce new practice sentences as the main task.
13. Practice answers must be in the studied language (studyLanguage / inferred from source).

## Instruction / title (required for UX)
14. For EVERY exercise set instruction and skillLabel carefully:
    Priority for instruction:
      (1) Copy the original explicit worksheet instruction from the source (same language).
      (2) If none, use a clearly present column header / task line from the source.
      (3) If still insufficient, use the neutral fallback exactly: "Complete the exercise."
    NEVER invent a specific grammar/topic instruction (e.g. do not invent "Write the adjective in plural partitive") unless those words appear in the source.
    skillLabel = short title/heading from the source when present (same language). Do not invent a fancy title.
15. Keep instruction in the source language. Do not translate unless the source itself is translated.
16. JSON only:
{
  "theoryFocus": string,
  "exercises": [ {
    "type": "fill_blank" | "transformation" | "multiple_choice",
    "learningObjective": string,
    "targetType": "suffix" | "prefix" | "word_form" | "full_word" | "structure" | "concept",
    "sentence"?: string,
    "answer"?: string,
    "acceptedAnswers"?: string[],
    "sourceWord"?: string,
    "completedSentence"?: string,
    "promptWord"?: string,
    "prompt"?: string,
    "options"?: string[],
    "correctOption"?: string,
    "instruction": string,
    "skillLabel"?: string,
    "showArrow"?: boolean,
    "hint": string,
    "explanation"?: string,
    "materialSource": "theory"
  } ]
}
17. fill_blank sentence MUST use exactly one blank as eight underscores: ________
18. No markdown in JSON strings except whatever already exists inside a copied source sentence.`;

/** Collapse whitespace and lowercase for containment checks. */
export function normalizeSourceForMatch(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceContainsPhrase(sourceNorm: string, phrase: string): boolean {
  const needle = normalizeSourceForMatch(phrase);
  if (!needle || needle.length < 2) return false;
  return sourceNorm.includes(needle);
}

function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Cue match tolerant of list prefixes (a. / 1.), punctuation, and diacritics.
 */
export function sourceContainsCue(sourceText: string, cue: string): boolean {
  const sourceNorm = normalizeSourceForMatch(sourceText);
  const needle = normalizeSourceForMatch(cue);
  if (!sourceNorm || !needle || needle.length < 2) return false;
  if (sourceNorm.includes(needle)) return true;

  const stripped = needle.replace(/^(?:[a-z]|\d+)\s+/, "");
  if (stripped.length >= 2 && sourceNorm.includes(stripped)) return true;

  const foldedSource = foldDiacritics(sourceNorm);
  const foldedNeedle = foldDiacritics(stripped.length >= 2 ? stripped : needle);
  if (foldedSource.includes(foldedNeedle)) return true;

  const tokens = foldedSource.split(" ").filter(Boolean);
  return tokens.some(
    (token) =>
      token === foldedNeedle ||
      (foldedNeedle.length >= 3 && token.startsWith(foldedNeedle)) ||
      (token.length >= 3 && foldedNeedle.startsWith(token)),
  );
}

/**
 * True when every significant token of phrase appears in source (order-independent).
 * Used for instructions that combine title + column header.
 */
function sourceContainsTokens(sourceNorm: string, phrase: string, minLen = 3): boolean {
  const tokens = normalizeSourceForMatch(phrase)
    .split(" ")
    .filter((t) => t.length >= minLen);
  if (tokens.length === 0) return true;
  const hit = tokens.filter((t) => sourceNorm.includes(t)).length;
  return hit / tokens.length >= 0.7;
}

function sentenceFrameFromFillBlank(sentence: string): string {
  return sentence.replace(/_{3,}/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Keep drafts whose cues/sentences are grounded in the source.
 * Ungrounded instructions are cleared (not rejected) — applyImportInstructionFidelity
 * restores a neutral UI fallback.
 */
export function filterDraftsToSourceFidelity(
  drafts: TheoryAiExerciseDraft[],
  extractedText: string,
  options?: { relaxSentenceFrames?: boolean },
): TheoryAiExerciseDraft[] {
  const sourceNorm = normalizeSourceForMatch(extractedText);
  if (!sourceNorm) return [];

  return drafts.flatMap((draft) => {
    const next: TheoryAiExerciseDraft = { ...draft };
    // Never drop a card only because instruction was invented — scrub it.
    if (
      next.instruction &&
      !isNeutralInstruction(next.instruction) &&
      !instructionGroundedInSource(next.instruction, extractedText)
    ) {
      next.instruction = undefined;
    }

    if (next.type === "transformation") {
      const cue = next.promptWord?.trim() || next.sourceWord?.trim() || "";
      if (!cue || !sourceContainsCue(extractedText, cue)) return [];
      if (!next.answer?.trim()) return [];
      return [next];
    }

    if (next.type === "fill_blank") {
      const sentence = next.sentence?.trim() ?? "";
      if (!sentence || !next.answer?.trim()) return [];
      const frame = sentenceFrameFromFillBlank(sentence);
      const cue = next.sourceWord?.trim() || next.promptWord?.trim() || "";
      if (cue && !sourceContainsCue(extractedText, cue)) return [];

      // Strict: sentence frame must come from source. Relaxed: cue+answer enough.
      if (!options?.relaxSentenceFrames && frame.length >= 8) {
        if (
          !sourceContainsPhrase(sourceNorm, frame) &&
          !sourceContainsTokens(sourceNorm, frame, 3)
        ) {
          return [];
        }
      }
      return [next];
    }

    if (next.type === "multiple_choice") {
      const prompt = next.prompt?.trim() ?? "";
      if (!prompt || !sourceContainsTokens(sourceNorm, prompt, 3)) return [];
      return [next];
    }

    return [];
  });
}

/** Normalize instruction/title after AI; force neutral when ungrounded. */
export function applyImportInstructionFidelity(
  drafts: TheoryAiExerciseDraft[],
  extractedText: string,
  importTitle: string,
): TheoryAiExerciseDraft[] {
  return drafts.map((draft) => {
    const instruction =
      resolveImportInstruction({
        instruction: draft.instruction,
        skillLabel: draft.skillLabel,
        sourceText: extractedText,
      }) ?? undefined;
    const skillLabel = resolveImportSkillLabel({
      skillLabel: draft.skillLabel,
      importTitle,
      sourceText: extractedText,
    });
    const showArrow =
      draft.showArrow === false || isWriteSentenceTask(instruction)
        ? false
        : draft.showArrow;

    return {
      ...draft,
      instruction,
      skillLabel,
      showArrow,
    };
  });
}

/**
 * Worksheet-like sources have explicit blanks/cues; notes/theory pages explain rules.
 * Notes should use the Theory invent pipeline when cue-fidelity finds nothing.
 */
export function classifyImportSource(
  extractedText: string,
): "worksheet" | "notes" {
  const worksheetSignals =
    (/\(blank\)/i.test(extractedText) ? 1 : 0) +
    (extractedText.includes("| ---") || extractedText.includes("|---") ? 1 : 0) +
    (/\n\s*[a-z]\.\s+\S+/i.test(extractedText) ? 1 : 0) +
    (/_{3,}/.test(extractedText) ? 1 : 0) +
    (/\btehtävä\b|\bbài tập\b|\bexercise\b/i.test(extractedText) &&
    /\b(täydennä|điền|fill|kirjoita|viết)\b/i.test(extractedText)
      ? 1
      : 0);

  const notesSignals =
    (/\blý thuyết\b|\bteoria\b|\btheory\b/i.test(extractedText) ? 1 : 0) +
    (/\bkhi dùng\b|\bwhen to use\b|\besimerkki\b|\bvídụ\b|\bví dụ\b/i.test(
      extractedText,
    )
      ? 1
      : 0);

  if (worksheetSignals >= 2) return "worksheet";
  if (notesSignals >= 1 && worksheetSignals === 0) return "notes";
  if (worksheetSignals >= 1) return "worksheet";
  return "notes";
}

async function generateFromImportedNotes(input: {
  importId: string;
  title: string;
  extractedText: string;
  studyLanguage?: string;
}): Promise<TheoryExercise[]> {
  const doc = plainTextToTheoryDoc(input.extractedText);
  try {
    const items = await generateAiTheoryExercises({
      theoryId: input.importId,
      theoryTitle: input.title,
      doc,
      count: 20,
      studyLanguage: input.studyLanguage,
    });
    if (items.length === 0) {
      throw new ExerciseImportError("GENERATION_FAILED");
    }
    return items;
  } catch (error) {
    if (error instanceof ExerciseImportError) throw error;
    if (error instanceof Error && error.message === "OPENAI_NOT_CONFIGURED") {
      throw new ExerciseImportError("OPENAI_NOT_CONFIGURED");
    }
    if (error instanceof Error && error.message === "AI_INVALID_RESPONSE") {
      throw new ExerciseImportError("GENERATION_FAILED");
    }
    throw error;
  }
}

/**
 * Generate practice from imported text.
 * Worksheet path: cue-fidelity cards only.
 * Notes/theory path (or fidelity miss): Theory invent pipeline from extracted text.
 */
export async function generateExercisesFromSourceText(input: {
  importId: string;
  title: string;
  extractedText: string;
  studyLanguage?: string;
}): Promise<TheoryExercise[]> {
  const extractedText = input.extractedText.trim();
  if (!extractedText) {
    throw new ExerciseImportError("EMPTY_CONTENT");
  }

  const studyLanguage = input.studyLanguage?.trim() || undefined;
  const sourceKind = classifyImportSource(extractedText);

  if (sourceKind === "notes") {
    console.info("[exercise-import] Notes/theory source — using Theory pipeline");
    return generateFromImportedNotes({
      importId: input.importId,
      title: input.title,
      extractedText,
      studyLanguage,
    });
  }

  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 8_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: IMPORT_SOURCE_FIDELITY_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          title: input.title,
          studyLanguage: studyLanguage ?? null,
          reminder:
            "Do NOT invent sentences or new words. Cards must reuse source cues/instructions only. Do not pad count.",
          sourceText: extractedText.slice(0, 20_000),
        }),
      },
    ],
  });

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  if (!raw) {
    console.error("[exercise-import] AI returned non-JSON content");
    throw new ExerciseImportError("GENERATION_FAILED");
  }

  const drafts = parseImportAiExercises(raw);
  if (drafts.length === 0) {
    console.warn(
      "[exercise-import] Worksheet fidelity produced no drafts — falling back to Theory pipeline",
    );
    return generateFromImportedNotes({
      importId: input.importId,
      title: input.title,
      extractedText,
      studyLanguage,
    });
  }

  let grounded = filterDraftsToSourceFidelity(drafts, extractedText);
  if (grounded.length === 0) {
    grounded = filterDraftsToSourceFidelity(drafts, extractedText, {
      relaxSentenceFrames: true,
    });
    console.warn("[exercise-import] Strict fidelity empty; using relaxed cue filter", {
      draftCount: drafts.length,
      groundedCount: grounded.length,
    });
  }

  const withInstructions = applyImportInstructionFidelity(
    grounded,
    extractedText,
    input.title,
  );
  const items = mapAiDraftsToTheoryExercises(
    input.importId,
    withInstructions,
    input.title,
    IMPORT_MAX_EXERCISES,
    studyLanguage,
  );

  if (items.length === 0) {
    console.warn(
      "[exercise-import] Cue fidelity empty — falling back to Theory pipeline",
      {
        draftCount: drafts.length,
        sampleCues: drafts.slice(0, 5).map((d) => d.promptWord ?? d.sourceWord),
        sourcePreview: extractedText.slice(0, 240),
      },
    );
    return generateFromImportedNotes({
      importId: input.importId,
      title: input.title,
      extractedText,
      studyLanguage,
    });
  }

  return items;
}
