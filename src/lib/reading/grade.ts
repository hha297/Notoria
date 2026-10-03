import OpenAI from "openai";
import { z } from "zod";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import { ReadingError, toReadingError } from "@/lib/reading/errors";
import type {
  ReadingAnswerFeedback,
  ReadingQuestionType,
  ReadingTfnsAnswer,
} from "@/lib/reading/types";
import { isReadingTfnsAnswer, normalizeComparable } from "@/lib/reading/utils";

const writtenGradeSchema = z.object({
  results: z
    .array(
      z.object({
        questionId: z.string().min(1),
        isCorrect: z.boolean(),
        score: z.number().min(0).max(1).optional(),
        summary: z.string().trim().max(600).optional(),
        strengths: z.array(z.string().trim().max(240)).max(5).optional(),
        improvements: z.array(z.string().trim().max(240)).max(5).optional(),
      }),
    )
    .min(1),
});

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ReadingError("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 90_000 });
}

function asTfns(value: unknown): ReadingTfnsAnswer | null {
  const normalized = normalizeComparable(value).replace(/[\s-]+/g, "_");
  if (normalized === "notstated") return "not_stated";
  return isReadingTfnsAnswer(normalized) ? normalized : null;
}

export function gradeObjectiveAnswer(input: {
  type: ReadingQuestionType;
  correctAnswer: unknown;
  response: unknown;
}): boolean | null {
  if (input.type === "written") return null;

  if (input.type === "true_false_not_stated") {
    const expected = asTfns(input.correctAnswer);
    const actual = asTfns(input.response);
    if (!expected || !actual) return false;
    return expected === actual;
  }

  // multiple_choice
  return (
    normalizeComparable(input.correctAnswer) ===
    normalizeComparable(input.response)
  );
}

export type WrittenGradeItem = {
  questionId: string;
  isCorrect: boolean;
  feedback: ReadingAnswerFeedback;
};

export async function gradeWrittenAnswers(input: {
  passageTitle: string;
  passageBody: string;
  questionLanguage: string;
  items: Array<{
    questionId: string;
    prompt: string;
    response: unknown;
    keyPoints: string[] | null;
    explanation: string | null;
    excerpt: string | null;
  }>;
}): Promise<WrittenGradeItem[]> {
  if (input.items.length === 0) return [];

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 4_000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: await aiSystemPrompt(
            `Grade short written reading-comprehension answers.

Return JSON:
{
  "results": [
    {
      "questionId": string,
      "isCorrect": boolean,
      "score": number (0-1),
      "summary": string,
      "strengths": string[],
      "improvements": string[]
    }
  ]
}

Rules:
- Compare each answer to keyPoints and the passage.
- isCorrect true when the response covers the essential key points (paraphrase OK).
- Be fair to language learners; minor grammar issues alone should not fail a content-correct answer.
- Write feedback in questionLanguage.`,
            { responseStyle: true, correctionStyle: true },
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            passageTitle: input.passageTitle,
            questionLanguage: input.questionLanguage,
            passage: input.passageBody.slice(0, 12_000),
            items: input.items.map((item) => ({
              questionId: item.questionId,
              prompt: item.prompt,
              response:
                typeof item.response === "string"
                  ? item.response
                  : JSON.stringify(item.response),
              keyPoints: item.keyPoints ?? [],
              explanation: item.explanation,
              excerpt: item.excerpt,
            })),
          }),
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      throw new ReadingError("GRADING_FAILED");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new ReadingError("GRADING_FAILED");
    }

    const parsed = writtenGradeSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new ReadingError("GRADING_FAILED");
    }

    const byId = new Map(
      parsed.data.results.map((result) => [result.questionId, result]),
    );

    return input.items.map((item) => {
      const result = byId.get(item.questionId);
      if (!result) {
        return {
          questionId: item.questionId,
          isCorrect: false,
          feedback: {
            summary: "Could not grade this answer.",
          },
        };
      }
      return {
        questionId: item.questionId,
        isCorrect: result.isCorrect,
        feedback: {
          summary: result.summary,
          strengths: result.strengths,
          improvements: result.improvements,
          score: result.score,
        },
      };
    });
  } catch (error) {
    throw toReadingError(error);
  }
}
