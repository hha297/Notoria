import { z } from "zod";
import {
  AI_OUTPUT_TOKENS,
  afterProviderError,
  clipForAi,
} from "@/lib/ai/bounds";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import type { TheoryExercise } from "@/lib/theory-exercises/types";

function isDeadlineExceeded(error: unknown): boolean {
  return error instanceof Error && error.message === "AI_DEADLINE_EXCEEDED";
}

/**
 * Semantic judge for Theory exercises.
 * Uses general criteria only — no sample words, sentences, or language-specific fixes.
 */
export const THEORY_EXERCISE_SEMANTIC_PROMPT = `You validate practice exercises against a Theory learning objective.

Read theoryTitle, theoryFocus, and theoryRules first. Infer the EXACT grammatical category being taught (case, tense, mood, number, agreement pattern, construction, etc.).

For EACH exercise, fill every field, then set accept=true only when EVERY condition holds:

1. Form-category match (critical): requiredCategory = the Theory category above. answerCategory = the real grammatical category of the tested answer token (blank / transformation / correct option), judged from morphology and sentence role — NOT from instruction/explanation labels. formMatchesTheory=true only when answerCategory is the SAME category as requiredCategory. If the answer is a different category that merely happens to be grammatical in the sentence, formMatchesTheory=false and accept=false. Labels that name the Theory category while the answer is another category are lies — reject.
2. Target selection: the tested answer is the token that practices the Theory objective. Finding the objective category on a different word while testing another category is a failure.
3. Competing objective form: if another word in completedSentence already shows the Theory’s required category while the blank tests a different category, reject.
4. Base form: when a source/base cue is provided, it must be the dictionary base of the tested answer, and the learner task must be producing that answer from the cue in this context.
5. Sentence quality: the completed sentence (or prompt for non-sentence types) is natural, grammatical, and coherent in the study language. A valid isolated inflection does not prove it belongs in the sentence.
6. Field consistency: learningObjective, instruction, explanation, hint, and translation (when present) describe the SAME task as producing this answer. The explanation must explain the transformation or usage in this context — not only restate the topic or title — and must not misname the answer’s category.
7. Do not accept an exercise merely because the generator claims the requested grammar. Inspect morphology and syntax yourself.

Return JSON only:
{ "results": [ {
  "id": string,
  "requiredCategory": string,
  "answerCategory": string,
  "formMatchesTheory": boolean,
  "accept": boolean,
  "reason": string
} ] }

Rules:
- One result per input id. Do not invent ids.
- accept may be true ONLY when formMatchesTheory is true AND conditions 2–7 hold.
- reason is a short English note for logging (no learner-facing sample exercises).
- No markdown.`;

const semanticResultSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        requiredCategory: z.string().max(120).optional(),
        answerCategory: z.string().max(120).optional(),
        formMatchesTheory: z.boolean().optional(),
        accept: z.boolean(),
        reason: z.string().max(240).optional(),
      }),
    )
    .max(40),
});

/** Interactive sets are ~10 items — one judge call is faster than chunk fan-out. */
export const THEORY_SEMANTIC_CHUNK_SIZE = 12;

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function exercisePayload(item: TheoryExercise) {
  if (item.type === "fill_blank") {
    return {
      id: item.id,
      type: item.type,
      learningObjective: item.learningObjective,
      instruction: item.instruction ?? null,
      targetType: item.targetType,
      sourceWord: item.sourceWord ?? null,
      answer: item.answer,
      acceptedAnswers: item.acceptedAnswers,
      sentenceWithBlank: item.sentence,
      completedSentence: item.completedSentence ?? null,
      sentenceMeaning: item.sentenceMeaning ?? null,
      hint: item.hint ?? null,
      explanation: item.explanation ?? null,
      skillLabel: item.skillLabel ?? null,
    };
  }
  if (item.type === "transformation") {
    return {
      id: item.id,
      type: item.type,
      learningObjective: item.learningObjective,
      instruction: item.instruction ?? null,
      targetType: item.targetType,
      sourceWord: item.promptWord,
      answer: item.answer,
      acceptedAnswers: item.acceptedAnswers,
      completedSentence: item.completedSentence ?? null,
      hint: item.hint ?? null,
      explanation: item.explanation ?? null,
      skillLabel: item.skillLabel ?? null,
    };
  }
  return {
    id: item.id,
    type: item.type,
    learningObjective: item.learningObjective,
    instruction: item.instruction ?? null,
    targetType: item.targetType,
    prompt: item.prompt,
    options: item.options,
    correctOption: item.correctOption,
    acceptedAnswers: item.acceptedAnswers,
    hint: item.hint ?? null,
    explanation: item.explanation ?? null,
    skillLabel: item.skillLabel ?? null,
  };
}

/** Pure gate used after the LLM judge responds. */
export function exercisePassesSemanticResult(
  row:
    | {
        accept: boolean;
        formMatchesTheory?: boolean;
      }
    | undefined,
): boolean {
  // Missing judge row → keep (partial response / structural already passed).
  if (!row) return true;
  // Explicit form-category mismatch always drops, even if accept was true.
  if (row.formMatchesTheory === false) return false;
  return row.accept === true;
}

function keepAfterSemanticJudge(
  items: TheoryExercise[],
  results: z.infer<typeof semanticResultSchema>["results"],
): TheoryExercise[] {
  const byId = new Map(results.map((row) => [row.id, row] as const));
  return items.filter((item) =>
    exercisePassesSemanticResult(byId.get(item.id)),
  );
}

async function judgeSemanticChunk(input: {
  items: TheoryExercise[];
  theoryTitle: string;
  theoryFocus?: string;
  theoryRules: string;
  studyLanguage?: string;
  signal?: AbortSignal;
  systemPrompt: string;
}): Promise<TheoryExercise[]> {
  let completion;
  try {
    const client = requireOpenAiClient({ timeoutMs: 60_000 });
    completion = await client.chat.completions.create(
      {
        model: "gpt-5.6-luna",
        reasoning_effort: "none",
        temperature: 0,
        max_completion_tokens: AI_OUTPUT_TOKENS.theoryValidate,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({
              studyLanguage: input.studyLanguage ?? null,
              theoryTitle: clipForAi(input.theoryTitle, 200),
              theoryFocus: input.theoryFocus
                ? clipForAi(input.theoryFocus, 400)
                : null,
              theoryRules: clipForAi(input.theoryRules, 2_500),
              reminder:
                "Reject when answerCategory differs from requiredCategory, even if labels claim the Theory form.",
              exercises: input.items.map(exercisePayload),
            }),
          },
        ],
      },
      input.signal ? { signal: input.signal } : undefined,
    );
  } catch (error) {
    if (input.signal?.aborted) {
      throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
    }
    console.error("theory exercise semantic validation failed");
    return input.items;
  }

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const parsed = semanticResultSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("theory exercise semantic validation parse failed");
    return input.items;
  }

  return keepAfterSemanticJudge(input.items, parsed.data.results);
}

/**
 * LLM semantic filter. On provider/parse failure, returns the input unchanged
 * (structural validation already ran). Rejected ids are dropped.
 */
export async function validateTheoryExercisesSemantically(input: {
  items: TheoryExercise[];
  theoryTitle: string;
  theoryFocus?: string;
  theoryRules: string;
  studyLanguage?: string;
  signal?: AbortSignal;
}): Promise<TheoryExercise[]> {
  if (input.items.length === 0) return [];

  const systemPrompt = await aiSystemPrompt(THEORY_EXERCISE_SEMANTIC_PROMPT, {
    responseStyle: true,
  });

  if (input.signal?.aborted) {
    throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
  }

  const chunks: TheoryExercise[][] = [];
  for (let i = 0; i < input.items.length; i += THEORY_SEMANTIC_CHUNK_SIZE) {
    chunks.push(input.items.slice(i, i + THEORY_SEMANTIC_CHUNK_SIZE));
  }

  // Judge chunks in parallel — sequential judging was the main latency tax.
  const settled = await Promise.allSettled(
    chunks.map((chunk) =>
      judgeSemanticChunk({
        ...input,
        items: chunk,
        systemPrompt,
      }),
    ),
  );

  const keepIds = new Set<string>();
  for (let index = 0; index < settled.length; index += 1) {
    const result = settled[index]!;
    const chunk = chunks[index]!;
    if (result.status === "fulfilled") {
      for (const item of result.value) keepIds.add(item.id);
      continue;
    }
    if (input.signal?.aborted || isDeadlineExceeded(result.reason)) {
      throw afterProviderError(new Error("AI_DEADLINE_EXCEEDED"));
    }
    // Chunk judge failed — keep structural items from that chunk.
    for (const item of chunk) keepIds.add(item.id);
  }

  return input.items.filter((item) => keepIds.has(item.id));
}
