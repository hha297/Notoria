import OpenAI from "openai";
import { getLanguageByCode } from "@/lib/languages";
import { normalizeWritingAiResult } from "@/lib/writing/ai-filter";
import { writingActionPrompt } from "@/lib/writing/ai-prompt";
import {
  writingAiResultSchema,
  type WritingAiRequest,
  type WritingAiResult,
} from "@/lib/writing/ai-types";
import { writingFocusText } from "@/lib/writing/plain-text";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 20_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function languageHint(code: string | null | undefined) {
  if (!code) return null;
  return getLanguageByCode(code)?.name ?? code;
}

export async function analyzeWriting(input: WritingAiRequest): Promise<WritingAiResult> {
  const client = getOpenAIClient();
  const focusText = writingFocusText(
    input.action,
    input.content,
    input.selectedText,
  );

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: input.action === "improve" ? 0.35 : 0.15,
    max_tokens:
      input.action === "continue" ? 250 : input.action === "improve" ? 500 : 900,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: writingActionPrompt(input.action),
      },
      {
        role: "user",
        content: JSON.stringify({
          action: input.action,
          title: input.title || null,
          content: input.content,
          selectedText: input.selectedText || null,
          focusText,
          languageCode: input.language || null,
          languageHint: languageHint(input.language),
          cefrLevel: input.level ? input.level.toUpperCase() : null,
          topic: input.topic || null,
          formality: input.formality || null,
        }),
      },
    ],
  });

  const parsed = writingAiResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );

  if (!parsed.success) {
    console.error(
      "writing AI parse failed",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    throw new Error("AI_INVALID_RESPONSE");
  }

  return normalizeWritingAiResult(parsed.data, {
    action: input.action,
    content: input.content,
  });
}
