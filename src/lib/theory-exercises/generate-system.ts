/**
 * System exercise generation from generic Theory knowledge + Vocabulary material.
 * Language-agnostic: no hardcoded target-language rules or examples.
 */

import {
  analyzeTheory,
  type AnalyzedTheory,
  type RelationPattern,
} from "@/lib/theory-exercises/analyze";
import type { ExtractedTheoryContent } from "@/lib/theory-exercises/extract";
import {
  applyBestChange,
  buildDistractorsFromChanges,
  discoverChange,
  looksLikeGloss,
  shuffle,
  splitFillBlankParts,
  uid,
  type DiscoveredChange,
} from "@/lib/theory-exercises/patterns";
import type {
  TheoryExercise,
  TheoryFillBlankExercise,
  TheoryMaterialSource,
  TheoryMultipleChoiceExercise,
  TheoryTransformationExercise,
  TheoryVocabWord,
} from "@/lib/theory-exercises/types";

export type AppliedMaterial = {
  word: string;
  form: string;
  materialSource: TheoryMaterialSource;
  wordId?: string;
  change?: DiscoveredChange;
  patternHint?: string;
  knowledgePointId?: string;
};

function skillLabel(analysis: AnalyzedTheory) {
  return analysis.title || analysis.topic || "Theory";
}

const BLANK = "________";

function featurePoolFromAnalysis(analysis: AnalyzedTheory): string[] {
  const values: string[] = [];
  for (const feature of analysis.highlightedFeatures) {
    values.push(feature.value);
  }
  for (const change of analysis.changePool) {
    if (change.kind === "suffix" && change.to) values.push(change.to);
    if (change.kind === "prefix" && change.to) values.push(change.to);
  }
  return values;
}

function buildFillBlankFields(
  shownBase: string,
  expected: string,
  featurePool: string[] = [],
) {
  const split = splitFillBlankParts(shownBase, expected, featurePool);
  const sentence = split.spaced
    ? `${split.prefix} ${BLANK}${split.suffix ?? ""}`
    : `${split.prefix}${BLANK}${split.suffix ?? ""}`;
  return {
    sentence,
    answer: split.answer,
    prefix: split.prefix,
    suffix: split.suffix,
    spaced: split.spaced,
  };
}

export function formatPatternHint(change?: DiscoveredChange | null): string | undefined {
  if (!change) return undefined;
  if (change.kind === "suffix") {
    if (change.from.length > 0) return `-${change.from} → -${change.to}`;
    if (change.to.length > 0) return `… → -${change.to}`;
  }
  if (change.kind === "prefix") {
    if (change.from.length > 0) return `${change.from}- → ${change.to}-`;
    if (change.to.length > 0) return `… → ${change.to}-`;
  }
  if (change.kind === "replace" && change.to) {
    return change.to.length <= 24 ? change.to : undefined;
  }
  return undefined;
}

function collectedChanges(analysis: AnalyzedTheory): DiscoveredChange[] {
  const changes: DiscoveredChange[] = [];
  const seen = new Set<string>();
  for (const t of analysis.transformations) {
    if (!t.change) continue;
    const key = `${t.change.kind}|${t.change.from}|${t.change.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    changes.push(t.change);
  }
  return changes;
}

/**
 * Prefer Vocabulary words that match a discovered transformation pattern.
 * Fall back to Theory transformation exemplars (never glosses).
 */
export function selectAppliedMaterials(
  analysis: AnalyzedTheory,
  vocabulary: TheoryVocabWord[],
  options?: { max?: number },
): AppliedMaterial[] {
  const max = options?.max ?? 10;
  const materials: AppliedMaterial[] = [];
  const used = new Set<string>();
  const changes = collectedChanges(analysis);

  const vocabCandidates = shuffle(
    vocabulary.filter((v) => {
      const w = v.word.trim();
      return (
        w.length >= 2 &&
        w.length <= 40 &&
        w.split(" ").length === 1 &&
        !looksLikeGloss(w)
      );
    }),
  );

  for (const item of vocabCandidates) {
    const applied = applyBestChange(item.word.trim(), changes);
    if (!applied) continue;
    const key = item.word.trim().toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    const change = discoverChange(item.word.trim(), applied.form) ?? applied.change;
    materials.push({
      word: item.word.trim(),
      form: applied.form,
      materialSource: "vocabulary",
      wordId: item.id,
      change,
      patternHint: formatPatternHint(change),
    });
    if (materials.length >= max) return materials;
  }

  for (const t of shuffle(analysis.transformations)) {
    const key = t.input.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    materials.push({
      word: t.input,
      form: t.output,
      materialSource: "theory",
      change: t.change,
      patternHint: formatPatternHint(t.change),
    });
    if (materials.length >= max) break;
  }

  return materials;
}

function makeTransformation(
  theoryId: string,
  analysis: AnalyzedTheory,
  material: AppliedMaterial,
): TheoryTransformationExercise {
  return {
    id: uid("xf"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "transformation",
    typeLabelKey: "transformation",
    materialSource: material.materialSource,
    skillLabel: skillLabel(analysis),
    instruction: "Apply the rule to the following word.",
    promptWord: material.word,
    answer: material.form,
    showArrow: true,
    hint: material.patternHint,
  };
}

function makeFillTransformation(
  theoryId: string,
  analysis: AnalyzedTheory,
  material: AppliedMaterial,
): TheoryFillBlankExercise {
  const fields = buildFillBlankFields(
    material.word,
    material.form,
    featurePoolFromAnalysis(analysis),
  );
  return {
    id: uid("fill_xf"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "fill_blank",
    typeLabelKey: "fill_blank",
    materialSource: material.materialSource,
    skillLabel: skillLabel(analysis),
    instruction: "Complete the form.",
    hint: material.patternHint,
    ...fields,
  };
}

function makeFillWithContext(
  theoryId: string,
  analysis: AnalyzedTheory,
  material: AppliedMaterial,
  context: string,
): TheoryFillBlankExercise {
  const fields = buildFillBlankFields(
    context,
    material.form,
    featurePoolFromAnalysis(analysis),
  );
  return {
    id: uid("fill_ctx"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "fill_blank",
    typeLabelKey: "fill_blank",
    materialSource: material.materialSource,
    skillLabel: skillLabel(analysis),
    instruction: "Fill in the correct form.",
    hint: material.patternHint,
    ...fields,
  };
}

function makeFormMc(
  theoryId: string,
  analysis: AnalyzedTheory,
  material: AppliedMaterial,
): TheoryMultipleChoiceExercise | null {
  const distractors = buildDistractorsFromChanges(
    material.word,
    material.form,
    analysis.changePool,
    3,
  );
  if (distractors.length < 2) return null;

  return {
    id: uid("mc"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "multiple_choice",
    typeLabelKey: "multiple_choice",
    materialSource: material.materialSource,
    skillLabel: skillLabel(analysis),
    instruction: "Choose the correct form.",
    prompt: `Which is the correct form of “${material.word}”?`,
    options: shuffle([material.form, ...distractors.slice(0, 3)]),
    correctOption: material.form,
  };
}

function relationHint(analysis: AnalyzedTheory, right: string): string | undefined {
  const lower = right.toLowerCase();
  for (const feature of analysis.highlightedFeatures) {
    if (lower.endsWith(feature.value.toLowerCase()) || lower.startsWith(feature.value.toLowerCase())) {
      return feature.value;
    }
  }
  return undefined;
}

function makeRelationFill(
  theoryId: string,
  analysis: AnalyzedTheory,
  relation: RelationPattern,
): TheoryFillBlankExercise {
  const hintValue = relationHint(analysis, relation.right);
  const fields = buildFillBlankFields(
    relation.left,
    relation.right,
    featurePoolFromAnalysis(analysis),
  );
  return {
    id: uid("fill_rel"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "fill_blank",
    typeLabelKey: "fill_blank",
    materialSource: "theory",
    skillLabel: skillLabel(analysis),
    instruction: "Complete the construction.",
    hint: hintValue ? `… → ${hintValue}` : undefined,
    ...fields,
  };
}

function makeRelationMc(
  theoryId: string,
  analysis: AnalyzedTheory,
  relation: RelationPattern,
): TheoryMultipleChoiceExercise | null {
  const distractors = buildDistractorsFromChanges(
    relation.right,
    relation.right,
    analysis.changePool,
    3,
  ).filter((d) => d.toLowerCase() !== relation.right.toLowerCase());

  if (distractors.length < 2) return null;

  return {
    id: uid("mc_rel"),
    source: "theory",
    theoryId,
    generator: "system",
    type: "multiple_choice",
    typeLabelKey: "multiple_choice",
    materialSource: "theory",
    skillLabel: skillLabel(analysis),
    instruction: "Choose the form that fits this context.",
    prompt: `After “${relation.left}”, which form is correct?`,
    options: shuffle([relation.right, ...distractors.slice(0, 3)]),
    correctOption: relation.right,
  };
}

function generateFromMaterials(
  theoryId: string,
  analysis: AnalyzedTheory,
  materials: AppliedMaterial[],
): TheoryExercise[] {
  const items: TheoryExercise[] = [];
  // Optional context token from a relation left-side if available
  const contextToken = analysis.relations.find((r) => r.kind === "phrase")?.left;

  for (const material of materials) {
    items.push(makeTransformation(theoryId, analysis, material));
    items.push(makeFillTransformation(theoryId, analysis, material));
    if (contextToken) {
      items.push(makeFillWithContext(theoryId, analysis, material, contextToken));
    }
    const mc = makeFormMc(theoryId, analysis, material);
    if (mc) items.push(mc);
  }

  return items;
}

function generateFromRelations(
  theoryId: string,
  analysis: AnalyzedTheory,
): TheoryExercise[] {
  const items: TheoryExercise[] = [];
  for (const relation of shuffle(analysis.relations).slice(0, 8)) {
    items.push(makeRelationFill(theoryId, analysis, relation));
    const mc = makeRelationMc(theoryId, analysis, relation);
    if (mc) items.push(mc);
  }
  return items;
}

/**
 * Theory → analyze → Vocabulary/Theory material → exercises.
 * Only emits items with a clear answer derived from discovered knowledge.
 */
export function generateSystemTheoryExercises(
  theoryId: string,
  extracted: ExtractedTheoryContent,
  options?: {
    maxItems?: number;
    theoryTitle?: string;
    vocabulary?: TheoryVocabWord[];
  },
): TheoryExercise[] {
  const maxItems = options?.maxItems ?? 12;
  const analysis = analyzeTheory(extracted, options?.theoryTitle ?? "");
  const materials = selectAppliedMaterials(analysis, options?.vocabulary ?? [], {
    max: 8,
  });

  const combined = [
    ...generateFromMaterials(theoryId, analysis, materials),
    ...generateFromRelations(theoryId, analysis),
  ].filter((item) => {
    // Drop low-confidence empties
    if (item.type === "fill_blank" && !item.answer.trim()) return false;
    if (item.type === "transformation" && !item.answer.trim()) return false;
    if (item.type === "multiple_choice" && item.options.length < 2) return false;
    return true;
  });

  const priorityTypes: TheoryExercise["type"][] = [
    "transformation",
    "fill_blank",
    "multiple_choice",
  ];

  const byType = new Map<TheoryExercise["type"], TheoryExercise[]>();
  for (const item of combined) {
    const list = byType.get(item.type) ?? [];
    list.push(item);
    byType.set(item.type, list);
  }

  const result: TheoryExercise[] = [];
  let added = true;
  while (result.length < maxItems && added) {
    added = false;
    for (const type of priorityTypes) {
      const bucket = byType.get(type);
      if (!bucket?.length) continue;
      result.push(bucket.shift()!);
      added = true;
      if (result.length >= maxItems) break;
    }
  }

  return shuffle(result);
}

// Re-exports for tests / callers
export {
  applyBestChange,
  applyChange,
  buildDistractorsFromChanges,
  isStructuredPair,
  isTransformationPair,
} from "@/lib/theory-exercises/patterns";
export { analyzeTheory } from "@/lib/theory-exercises/analyze";
