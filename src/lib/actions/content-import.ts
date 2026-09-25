"use server";

import { revalidatePath } from "next/cache";
import {
  MAX_CONTENT_IMPORT_FILE_BYTES,
  type AnalyzeContentImportResult,
  type ColumnMapping,
  type ConfirmContentImportResult,
  type ContentImportTarget,
  type DocumentImportDraft,
  type ImportFieldId,
  type VocabImportDraft,
} from "@/lib/content-import";
import {
  analyzeExtractedContent,
  reanalyzeWithMappings,
} from "@/lib/content-import/analyze";
import {
  ContentImportExtractError,
  extractContentFromBuffer,
} from "@/lib/content-import/extract";
import { writingContentFromPlainText } from "@/lib/content-import/map-document";
import { resolveContentMime } from "@/lib/content-import/detect";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  loadEntitlementUser,
  runWithUsage,
} from "@/lib/billing/entitlements";
import {
  isQuotaExceededError,
  ProRequiredError,
} from "@/lib/billing/errors";
import { displayPlan, entitlementPlan } from "@/lib/billing/plans";
import { createVocabularyWord } from "@/lib/actions/vocabulary";
import { createWritingDocument } from "@/lib/actions/writing";
import { createTheoryNote } from "@/lib/actions/theory";
import {
  isKnownTheoryCategory,
  plainTextToTheoryDoc,
  serializeTheoryContent,
} from "@/lib/theory/content";
import {
  customTagKey,
  canonicalizeTagId,
  PARTS_OF_SPEECH,
} from "@/lib/vocabulary-tags";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import type { VocabularyFormValues } from "@/schemas/vocabulary";

export type ContentImportActionError =
  | { code: "PRO_REQUIRED" }
  | { code: "QUOTA_EXCEEDED"; limit: number; resetAt: string }
  | { code: "FILE_TOO_LARGE" }
  | { code: "UNSUPPORTED_FORMAT"; message: string }
  | { code: "EMPTY_FILE"; message: string }
  | { code: "PARSE_FAILED"; message: string }
  | { code: "UNAUTHORIZED" }
  | { code: "INVALID_INPUT" };

function mapExtractError(
  error: ContentImportExtractError,
): ContentImportActionError {
  if (error.code === "FILE_TOO_LARGE") return { code: "FILE_TOO_LARGE" };
  if (error.code === "EMPTY_FILE") {
    return { code: "EMPTY_FILE", message: error.message };
  }
  if (error.code === "LEGACY_DOC" || error.code === "UNSUPPORTED_FORMAT") {
    return { code: "UNSUPPORTED_FORMAT", message: error.message };
  }
  return { code: "PARSE_FAILED", message: error.message };
}

function mapBillingError(error: unknown): ContentImportActionError | null {
  if (error instanceof ProRequiredError) {
    return { code: "PRO_REQUIRED" };
  }
  if (isQuotaExceededError(error)) {
    return {
      code: "QUOTA_EXCEEDED",
      limit: error.body.limit,
      resetAt: error.body.resetAt,
    };
  }
  return null;
}

async function requireImportAccess() {
  const userId = await getCurrentUserId();
  const user = await loadEntitlementUser(userId);
  if (!user) throw new Error("UNAUTHORIZED");
  if (entitlementPlan(user) === "free") {
    throw new ProRequiredError("content_import", displayPlan(user));
  }
  return user;
}

export async function analyzeContentImport(formData: FormData): Promise<
  | { ok: true; analysis: AnalyzeContentImportResult }
  | { ok: false; error: ContentImportActionError }
> {
  try {
    await requireImportAccess();

    const target = String(formData.get("target") ?? "") as ContentImportTarget;
    if (
      target !== "vocabulary" &&
      target !== "writing" &&
      target !== "theory"
    ) {
      return { ok: false, error: { code: "INVALID_INPUT" } };
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: { code: "INVALID_INPUT" } };
    }
    if (file.size > MAX_CONTENT_IMPORT_FILE_BYTES) {
      return { ok: false, error: { code: "FILE_TOO_LARGE" } };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { format, extract } = await extractContentFromBuffer({
      buffer,
      fileName: file.name,
      mimeType: resolveContentMime(file),
    });

    const analysis = await analyzeExtractedContent({
      target,
      format,
      fileName: file.name,
      extract,
    });

    return { ok: true, analysis };
  } catch (error) {
    if (error instanceof ContentImportExtractError) {
      return { ok: false, error: mapExtractError(error) };
    }
    const billing = mapBillingError(error);
    if (billing) return { ok: false, error: billing };
    console.error("[content-import] analyze failed", error);
    return {
      ok: false,
      error: {
        code: "PARSE_FAILED",
        message: "We couldn't read this file. Try CSV, PDF, or DOCX.",
      },
    };
  }
}

export async function reanalyzeContentImportMapping(input: {
  target: ContentImportTarget;
  format: AnalyzeContentImportResult["format"];
  fileName: string;
  headers: string[];
  rows: string[][];
  mappings: ColumnMapping[];
}): Promise<
  | { ok: true; analysis: AnalyzeContentImportResult }
  | { ok: false; error: ContentImportActionError }
> {
  try {
    await requireImportAccess();
    const analysis = reanalyzeWithMappings(input);
    return { ok: true, analysis };
  } catch (error) {
    const billing = mapBillingError(error);
    if (billing) return { ok: false, error: billing };
    return { ok: false, error: { code: "INVALID_INPUT" } };
  }
}

function normalizeImportTags(tags: string[]): string[] {
  const result: string[] = [];
  for (const raw of tags) {
    const canonical = canonicalizeTagId(raw.trim());
    if (canonical) {
      result.push(canonical);
      continue;
    }
    const name = raw.trim();
    if (name) result.push(customTagKey(name));
  }
  return result;
}

async function saveVocabItems(
  items: VocabImportDraft[],
  skipIssueRows: boolean,
): Promise<ConfirmContentImportResult> {
  let imported = 0;
  let skippedAlreadyExists = 0;
  let skippedInvalid = 0;
  let failed = 0;
  const details: ConfirmContentImportResult["details"] = [];

  for (const item of items) {
    const label = item.word.trim() || `Row ${item.rowIndex + 1}`;

    if (item.status === "skipped") {
      skippedInvalid++;
      details.push({
        kind: "invalid",
        rowIndex: item.rowIndex,
        label,
        message: "Marked to skip.",
      });
      continue;
    }
    if (item.status === "issue" && skipIssueRows) {
      skippedInvalid++;
      const reason =
        item.issues[0]?.message ??
        "This row had problems and was skipped.";
      details.push({
        kind: "invalid",
        rowIndex: item.rowIndex,
        label,
        message: reason,
      });
      continue;
    }
    if (!item.word || item.meanings.length === 0) {
      skippedInvalid++;
      details.push({
        kind: "invalid",
        rowIndex: item.rowIndex,
        label,
        message: "Missing word or meaning.",
      });
      continue;
    }

    try {
      const pos = item.partOfSpeech?.toLowerCase().trim();
      const partOfSpeech = PARTS_OF_SPEECH.includes(
        pos as (typeof PARTS_OF_SPEECH)[number],
      )
        ? (pos as VocabularyFormValues["partOfSpeech"])
        : undefined;

      await createVocabularyWord({
        word: item.word,
        partOfSpeech,
        notes: item.notes,
        meanings: item.meanings.map((meaning, index) => ({
          meaning,
          isPrimary: index === 0,
          sortOrder: index,
        })),
        examples: item.examples.map((sentence, index) => ({
          sentence,
          meaning: "",
          notes: "",
          sortOrder: index,
        })),
        tags: normalizeImportTags(item.tags),
        synonymIds: [],
      });
      imported++;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === VOCABULARY_WORD_EXISTS
      ) {
        skippedAlreadyExists++;
        details.push({
          kind: "already_exists",
          rowIndex: item.rowIndex,
          label: item.word,
          message: "Already in your vocabulary.",
        });
        continue;
      }
      failed++;
      details.push({
        kind: "failed",
        rowIndex: item.rowIndex,
        label: item.word,
        message: "Couldn't save this word. We continued with the rest.",
      });
    }
  }

  return {
    imported,
    skipped: skippedAlreadyExists + skippedInvalid,
    failed,
    skippedAlreadyExists,
    skippedInvalid,
    details,
  };
}

async function saveDocuments(
  target: "writing" | "theory",
  documents: DocumentImportDraft[],
  skipIssueRows: boolean,
): Promise<ConfirmContentImportResult> {
  let imported = 0;
  let skippedAlreadyExists = 0;
  let skippedInvalid = 0;
  let failed = 0;
  const details: ConfirmContentImportResult["details"] = [];

  for (const doc of documents) {
    const label = doc.title.trim() || `Row ${doc.rowIndex + 1}`;

    if (doc.status === "skipped") {
      skippedInvalid++;
      details.push({
        kind: "invalid",
        rowIndex: doc.rowIndex,
        label,
        message: "Marked to skip.",
      });
      continue;
    }
    if (doc.status === "issue" && skipIssueRows) {
      skippedInvalid++;
      details.push({
        kind: "invalid",
        rowIndex: doc.rowIndex,
        label,
        message:
          doc.issues[0]?.message ??
          "This row had problems and was skipped.",
      });
      continue;
    }
    if (!doc.title.trim() || !doc.content.trim()) {
      skippedInvalid++;
      details.push({
        kind: "invalid",
        rowIndex: doc.rowIndex,
        label,
        message: "Missing title or content.",
      });
      continue;
    }

    try {
      if (target === "writing") {
        await createWritingDocument({
          title: doc.title.trim(),
          description: "",
          type: "WRITING",
          content: writingContentFromPlainText(doc.content),
        });
      } else {
        const category =
          doc.category && isKnownTheoryCategory(doc.category)
            ? doc.category
            : "grammar";
        const result = await createTheoryNote({
          title: doc.title.trim(),
          category,
          description: doc.content.slice(0, 2000),
          content: serializeTheoryContent({
            kind: "theory",
            version: 1,
            category,
            description: doc.content.slice(0, 2000),
            doc: plainTextToTheoryDoc(doc.content),
          }) as Record<string, unknown>,
        });
        if (!result.ok) {
          failed++;
          details.push({
            kind: "failed",
            rowIndex: doc.rowIndex,
            label,
            message: "Couldn't save this document. We continued with the rest.",
          });
          continue;
        }
      }
      imported++;
    } catch {
      failed++;
      details.push({
        kind: "failed",
        rowIndex: doc.rowIndex,
        label,
        message: "Couldn't save this document. We continued with the rest.",
      });
    }
  }

  return {
    imported,
    skipped: skippedAlreadyExists + skippedInvalid,
    failed,
    skippedAlreadyExists,
    skippedInvalid,
    details,
  };
}

export async function confirmContentImport(input: {
  target: ContentImportTarget;
  mappings?: ColumnMapping[];
  headers?: string[];
  rows?: string[][];
  vocabItems?: VocabImportDraft[];
  documents?: DocumentImportDraft[];
  skipIssueRows?: boolean;
}): Promise<
  | { ok: true; result: ConfirmContentImportResult }
  | { ok: false; error: ContentImportActionError }
> {
  try {
    const user = await requireImportAccess();
    const skipIssueRows = input.skipIssueRows !== false;

    let vocabItems = input.vocabItems ?? [];
    let documents = input.documents ?? [];

    if (
      input.headers &&
      input.rows &&
      input.mappings &&
      input.headers.length > 0
    ) {
      const remapped = reanalyzeWithMappings({
        target: input.target,
        format: "csv",
        fileName: "import.csv",
        headers: input.headers,
        rows: input.rows,
        mappings: input.mappings,
      });
      vocabItems = remapped.vocabItems;
      documents = remapped.documents;
    }

    const result = await runWithUsage(user, "content_import", async () => {
      if (input.target === "vocabulary") {
        return saveVocabItems(vocabItems, skipIssueRows);
      }
      return saveDocuments(input.target, documents, skipIssueRows);
    });

    if (input.target === "vocabulary") revalidatePath("/vocabulary");
    if (input.target === "writing") revalidatePath("/writing");
    if (input.target === "theory") revalidatePath("/theory");

    return { ok: true, result };
  } catch (error) {
    const billing = mapBillingError(error);
    if (billing) return { ok: false, error: billing };
    console.error("[content-import] confirm failed", error);
    return { ok: false, error: { code: "INVALID_INPUT" } };
  }
}
