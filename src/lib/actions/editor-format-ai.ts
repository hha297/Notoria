"use server";

import type { JSONContent } from "@tiptap/react";
import { z } from "zod";
import {
  AiAssistanceDisabledError,
  getResolvedAiPreferences,
} from "@/lib/ai/preferences-server";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  editorDocToFormatPlainText,
  formatEditorDocumentWithAi,
  mergePreservedEditorNodes,
} from "@/lib/editor/format-document-ai";
import { formatTiptapDocument } from "@/lib/editor/format-document";
import { isTipTapDoc } from "@/lib/editor/format/types";

export type FormatEditorDocumentAiResult =
  | { ok: true; doc: JSONContent; source: "ai" }
  | { ok: true; doc: JSONContent; source: "fallback" }
  | { ok: false; code: "EMPTY" | "AI_UNAVAILABLE" | "AI_DISABLED" };

const inputSchema = z.object({
  doc: z.unknown(),
  language: z.string().trim().min(2).max(16).optional().nullable(),
  word: z.string().trim().max(120).optional().nullable(),
});

/**
 * AI Format for any TipTap editor (theory / writing / vocabulary notes).
 * Falls back to the deterministic formatter when AI is unavailable or disabled.
 */
export async function formatEditorDocumentAi(
  input: unknown,
): Promise<FormatEditorDocumentAiResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !isTipTapDoc(parsed.data.doc)) {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  const doc = parsed.data.doc;
  const language = parsed.data.language ?? null;
  const plain = editorDocToFormatPlainText(doc);
  if (!plain) {
    return { ok: false, code: "EMPTY" };
  }

  try {
    await getCurrentUserId();
  } catch {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  const prefs = await getResolvedAiPreferences();
  if (!prefs.enabled) {
    const fallback = formatTiptapDocument(doc, { language });
    return { ok: true, source: "fallback", doc: fallback };
  }

  try {
    const aiDoc = await formatEditorDocumentWithAi({
      text: plain,
      language,
      word: parsed.data.word,
    });
    const tidied = formatTiptapDocument(aiDoc, { language });
    return {
      ok: true,
      source: "ai",
      doc: mergePreservedEditorNodes(doc, tidied),
    };
  } catch (error) {
    if (error instanceof AiAssistanceDisabledError) {
      const fallback = formatTiptapDocument(doc, { language });
      return { ok: true, source: "fallback", doc: fallback };
    }
    console.error("formatEditorDocumentAi failed", error);
    const fallback = formatTiptapDocument(doc, { language });
    return {
      ok: true,
      source: "fallback",
      doc: fallback,
    };
  }
}
