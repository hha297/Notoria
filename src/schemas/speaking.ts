import { z } from "zod";
import { WRITING_CEFR_LEVELS, WRITING_TOPICS } from "@/lib/writing/meta";

export const speakingCefrSchema = z.enum(WRITING_CEFR_LEVELS);
export const speakingTopicSchema = z.enum(WRITING_TOPICS);

export const createSpeakingSessionSchema = z.object({
  title: z.string().trim().max(120).optional(),
  topic: speakingTopicSchema.optional(),
  cefrLevel: speakingCefrSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});
