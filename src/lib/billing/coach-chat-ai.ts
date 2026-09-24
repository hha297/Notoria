import OpenAI from "openai";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import {
  COACH_CHAT_SYSTEM_PROMPT,
  coachChatAiResponseSchema,
  type CoachChatAiResponse,
  type CoachChatHistoryMessage,
  type LearningCoachContext,
} from "@/lib/billing/coach-chat";

export async function generateCoachChatReply(input: {
  context: LearningCoachContext;
  message: string;
  history: CoachChatHistoryMessage[];
}): Promise<CoachChatAiResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const client = new OpenAI({ apiKey, timeout: 45_000 });
  const system = await aiSystemPrompt(COACH_CHAT_SYSTEM_PROMPT);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "system",
      content: `Learner facts (JSON). Use only these facts for personalization:\n${JSON.stringify(input.context)}`,
    },
  ];

  for (const turn of input.history) {
    messages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  messages.push({ role: "user", content: input.message });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("AI_INVALID_RESPONSE");
  }

  const parsed = coachChatAiResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("AI_INVALID_RESPONSE");
  }

  return parsed.data;
}
