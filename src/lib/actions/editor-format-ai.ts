"use server";

import type { JSONContent } from "@tiptap/react";
import { z } from "zod";
import {
  beginAiAbuseControl,
  isAiBusyError,
  isRateLimitedError,
} from "@/lib/ai/abuse-control";
import {
  AiAssistanceDisabledError,
  getResolvedAiPreferences,
} from "@/lib/ai/preferences-server";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { runWithUsage } from "@/lib/billing/entitlements";
import { QuotaExceededError } from "@/lib/billing/errors";
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
  | {
      ok: false;
      code:
        | "EMPTY"
        | "AI_UNAVAILABLE"
        | "AI_DISABLED"
        | "AI_QUOTA_EXCEEDED"
        | "RATE_LIMITED"
        | "AI_BUSY";
      retryAfterSeconds?: number;
    };

const inputSchema = z.object({
  doc: z.unknown(),
  language: z.string().trim().min(2).max(16).optional().nullable(),
  word: z.string().trim().max(120).optional().nullable(),
});

/**
 * AI Format for any TipTap editor (theory / writing / vocabulary notes).
 * Meters against `ai_writing`. Falls back to the deterministic formatter when
 * AI is disabled; quota / rate / busy failures are returned to the client
 * without contacting the provider.
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

  const user = await getCurrentUserRecord();
  if (!user) {
    return { ok: false, code: "AI_UNAVAILABLE" };
  }

  const prefs = await getResolvedAiPreferences();
  if (!prefs.enabled) {
    const fallback = formatTiptapDocument(doc, { language });
    return { ok: true, source: "fallback", doc: fallback };
  }

  let releaseAbuse: (() => void) | undefined;
  try {
    const gate = beginAiAbuseControl(user.id, "editor_format");
    releaseAbuse = gate.release;

    const aiDoc = await runWithUsage(user, "ai_writing", async () =>
      formatEditorDocumentWithAi({
        text: plain,
        language,
        word: parsed.data.word,
      }),
    );
    const tidied = formatTiptapDocument(aiDoc, { language });
    return {
      ok: true,
      source: "ai",
      doc: mergePreservedEditorNodes(doc, tidied),
    };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { ok: false, code: "AI_QUOTA_EXCEEDED" };
    }
    if (isRateLimitedError(error)) {
      return {
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (isAiBusyError(error)) {
      return { ok: false, code: "AI_BUSY" };
    }
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
  } finally {
    releaseAbuse?.();
  }
}
