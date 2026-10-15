import { z } from "zod";

export const studyInboxCaptureSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.string().trim().max(500).optional().or(z.literal("")),
  /** Capture folder id, or null/omitted for Unfiled. */
  folderId: z.string().uuid().nullable().optional(),
});

export type StudyInboxCaptureValues = z.infer<typeof studyInboxCaptureSchema>;

export const studyInboxProcessTargetSchema = z.enum([
  "vocabulary",
  "theory",
  "writing",
  "exercise",
  "keep",
  "delete",
]);

export type StudyInboxProcessTarget = z.infer<
  typeof studyInboxProcessTargetSchema
>;
