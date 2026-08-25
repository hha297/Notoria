import { z } from "zod";
import type { AnalyzedTheory } from "@/lib/theory-exercises/analyze";
import type { ExtractedTheoryContent } from "@/lib/theory-exercises/extract";
import { splitFillBlankParts } from "@/lib/theory-exercises/patterns";
import type {
  TheoryExercise,
  TheoryFillBlankExercise,
  TheoryMultipleChoiceExercise,
  TheoryTransformationExercise,
  TheoryVocabWord,
} from "@/lib/theory-exercises/types";

export const theoryAiExerciseSchema = z.object({
  type: z.enum(["transformation", "fill_blank", "multiple_choice"]),
  prompt: z.string().min(1).max(400).optional(),
  promptWord: z.string().min(1).max(80).optional(),
  sentence: z.string().min(1).max(400).optional(),
  answer: z.string().min(1).max(200).optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(6).optional(),
  correctOption: z.string().min(1).max(200).optional(),
  instruction: z.string().max(200).optional(),
  skillLabel: z.string().max(120).optional(),
  materialSource: z.enum(["theory", "vocabulary", "ai"]).optional(),
  explanation: z.string().max(500).optional(),
});

export const theoryAiResponseSchema = z.object({
  exercises: z.array(theoryAiExerciseSchema).max(8),
});

export type TheoryAiExerciseDraft = z.infer<typeof theoryAiExerciseSchema>;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function mapAiDraftsToTheoryExercises(
  theoryId: string,
  drafts: TheoryAiExerciseDraft[],
  fallbackSkill?: string,
): TheoryExercise[] {
  const items: TheoryExercise[] = [];
  const skill = fallbackSkill?.trim() || undefined;

  for (const draft of drafts) {
    const materialSource = draft.materialSource ?? "ai";
    const skillLabel = draft.skillLabel ?? skill;

    if (draft.type === "transformation" && draft.promptWord && draft.answer) {
      const xf: TheoryTransformationExercise = {
        id: uid("ai_xf"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "transformation",
        typeLabelKey: "transformation",
        materialSource,
        skillLabel,
        instruction: draft.instruction ?? "Apply the rule to the following word.",
        promptWord: draft.promptWord,
        answer: draft.answer,
        showArrow: true,
      };
      items.push(xf);
      continue;
    }

    if (draft.type === "fill_blank" && draft.sentence && draft.answer) {
      const beforeBlank = draft.sentence.split("________")[0]?.trim() ?? "";
      const afterBlank = draft.sentence.split("________")[1]?.trim();
      const split = beforeBlank
        ? splitFillBlankParts(beforeBlank, draft.answer)
        : { prefix: undefined, answer: draft.answer, suffix: afterBlank || undefined, spaced: undefined };
      const fill: TheoryFillBlankExercise = {
        id: uid("ai_fill"),
        source: "theory",
        theoryId,
        generator: "ai",
        type: "fill_blank",
        typeLabelKey: "fill_blank",
        materialSource,
        skillLabel,
        instruction: draft.instruction ?? "Fill in the correct form.",
        sentence: draft.sentence,
        answer: beforeBlank ? split.answer : draft.answer,
        prefix: beforeBlank ? split.prefix : undefined,
        suffix: afterBlank || split.suffix,
        spaced: split.spaced,
      };
      items.push(fill);
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
        explanation: draft.explanation,
      };
      items.push(mc);
    }
  }

  return items;
}

/** Compact context for the model — discovered structures only. */
export function buildTheoryAiContext(
  extracted: ExtractedTheoryContent,
  analysis?: AnalyzedTheory,
  vocabulary?: TheoryVocabWord[],
) {
  return {
    knowledgeKind: analysis?.kind,
    transformations: (analysis?.transformations ?? []).slice(0, 16).map((t) => ({
      input: t.input,
      output: t.output,
      change: t.change,
      context: t.context,
    })),
    relations: (analysis?.relations ?? []).slice(0, 16),
    definitions: (analysis?.definitions ?? []).slice(0, 10),
    highlightedFeatures: (analysis?.highlightedFeatures ?? []).slice(0, 12),
    vocabularyWords: (vocabulary ?? []).slice(0, 24).map((w) => w.word),
    sections: extracted.sections.slice(0, 8).map((s) => ({
      heading: s.heading,
      paragraphs: s.paragraphs.slice(0, 3),
    })),
    pairs: extracted.pairs.slice(0, 20),
    examples: extracted.examples.slice(0, 10),
    plainText: extracted.plainText.slice(0, 3500),
  };
}
