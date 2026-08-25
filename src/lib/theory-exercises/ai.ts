import OpenAI from "openai";
import { analyzeTheory } from "@/lib/theory-exercises/analyze";
import {
  buildTheoryAiContext,
  mapAiDraftsToTheoryExercises,
  theoryAiResponseSchema,
} from "@/lib/theory-exercises/generate-ai";
import { extractTheoryContent } from "@/lib/theory-exercises/extract";
import type { TheoryExercise, TheoryVocabWord } from "@/lib/theory-exercises/types";
import type { JSONContent } from "@tiptap/react";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 40_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

const THEORY_EXERCISE_AI_PROMPT = `You generate practice exercises from a learner's free-form Theory notes.

Critical constraints:
1. The learner may be studying ANY language or subject. Do not assume Finnish, English, or any other language.
2. Detect knowledge only from the provided Theory context and optional Vocabulary list.
3. Do not invent rules that are not supported by the Theory.
4. Do not copy Theory examples verbatim as the only practice; prefer applying the same rule to other suitable material.
5. Vocabulary words are independent material — they need not appear in the Theory.
6. If Vocabulary is empty or unsuitable, you may invent practice material that still follows the Theory's rule.
7. Only generate: transformation | fill_blank | multiple_choice.
8. Do NOT generate "complete the rule" label trivia, true/false about document layout, or theory_question items.
9. Match exercise shape to knowledge:
   - Input→output form changes → transformation / fill_blank / multiple_choice on a base form
   - Context + required form → fill_blank or multiple_choice in that context
   - Never ask for the "correct form of" an already-complete multi-word construction
10. Distractors must be plausible alternate forms of the SAME item (wrong pattern application), never unrelated glosses/translations.
11. skillLabel should be the Theory title when available.
12. Return JSON only:
{
  "exercises": [
    {
      "type": "transformation" | "fill_blank" | "multiple_choice",
      "promptWord"?: string,
      "sentence"?: string,
      "answer"?: string,
      "prompt"?: string,
      "options"?: string[],
      "correctOption"?: string,
      "instruction"?: string,
      "skillLabel"?: string,
      "materialSource"?: "theory" | "vocabulary" | "ai",
      "explanation"?: string
    }
  ]
}
13. Prefer fewer high-quality items over padding.
14. No markdown.`;

/**
 * Optional AI layer. Pro-gated at the API. Language-agnostic.
 */
export async function generateAiTheoryExercises(input: {
  theoryId: string;
  theoryTitle: string;
  doc: JSONContent;
  vocabulary?: TheoryVocabWord[];
  count?: number;
}): Promise<TheoryExercise[]> {
  const extracted = extractTheoryContent(input.doc);
  if (!extracted.plainText.trim()) return [];

  const analysis = analyzeTheory(extracted, input.theoryTitle);
  const client = getOpenAIClient();
  const context = buildTheoryAiContext(extracted, analysis, input.vocabulary);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.55,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: THEORY_EXERCISE_AI_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          title: input.theoryTitle,
          maxExercises: input.count ?? 4,
          knowledgeKind: analysis.kind,
          context,
        }),
      },
    ],
  });

  const raw = parseJsonContent(completion.choices[0]?.message?.content);
  const parsed = theoryAiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return mapAiDraftsToTheoryExercises(
    input.theoryId,
    parsed.data.exercises,
    input.theoryTitle,
  ).slice(0, input.count ?? 4);
}
