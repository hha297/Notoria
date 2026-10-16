import {
  AI_INPUT_LIMITS,
  AI_OUTPUT_TOKENS,
  clipForAi,
  clipOptional,
} from "@/lib/ai/bounds";
import { requireOpenAiClient } from "@/lib/ai/openai-client";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
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
  return requireOpenAiClient({ timeoutMs: 20_000 });
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

function writingMaxTokens(action: WritingAiRequest["action"]) {
  if (action === "continue") return AI_OUTPUT_TOKENS.writingContinue;
  if (action === "improve") return AI_OUTPUT_TOKENS.writingImprove;
  return AI_OUTPUT_TOKENS.writingCheck;
}

export async function analyzeWriting(input: WritingAiRequest): Promise<WritingAiResult> {
  const client = getOpenAIClient();
  const content = clipForAi(input.content, AI_INPUT_LIMITS.theory);
  const selectedText = clipOptional(
    input.selectedText,
    AI_INPUT_LIMITS.writtenAnswer * 2,
  );
  const topic = clipOptional(input.topic, AI_INPUT_LIMITS.topic);
  const title = clipOptional(input.title, AI_INPUT_LIMITS.title);
  const focusText = writingFocusText(input.action, content, selectedText);
  const usesCorrection =
    input.action === "check" || input.action === "correct";

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: input.action === "improve" ? 0.35 : 0.15,
    max_tokens: writingMaxTokens(input.action),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(writingActionPrompt(input.action), {
          responseStyle: true,
          correctionStyle: usesCorrection,
        }),
      },
      {
        role: "user",
        content: JSON.stringify({
          action: input.action,
          title,
          content,
          selectedText,
          focusText,
          languageCode: input.language || null,
          languageHint: languageHint(input.language),
          cefrLevel: input.level ? input.level.toUpperCase() : null,
          topic,
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
    content,
  });
}
