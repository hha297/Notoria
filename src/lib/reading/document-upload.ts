import { and, eq } from "drizzle-orm";
import {
  beginAiAbuseControl,
  isAiBusyError,
  isRateLimitedError,
} from "@/lib/ai/abuse-control";
import {
  AI_JOBS,
  forceReleaseJobLock,
  JobLockLostError,
  runExclusiveJob,
} from "@/lib/ai/job-lock";
import { db } from "@/db";
import { readingPassages } from "@/db/schema";
import {
  consumeUsage,
  finalizeUsageReservation,
  loadEntitlementUser,
  refundUsageReservation,
} from "@/lib/billing/entitlements";
import { QuotaExceededError } from "@/lib/billing/errors";
import { shouldRefundUsage } from "@/lib/ai/bounds";
import { deleteReadingBlob, downloadReadingBlob } from "@/lib/reading/blob";
import { ReadingError } from "@/lib/reading/errors";
import {
  buildReadingBlobPathname,
  isOwnedReadingBlobPathname,
  READING_STORAGE_PROVIDER,
  readingSourceTypeFromMime,
  validateReadingUploadFile,
} from "@/lib/reading/storage";
import {
  normalizePassageTitle,
  titleFromFilename,
  validatePassageBody,
} from "@/lib/reading/utils";

export type BeginReadingUploadResult = {
  documentId: string;
  pathname: string;
  mimeType: string;
  sizeBytes: number;
  originalFileName: string;
};

export async function beginReadingDocumentRecord(input: {
  userId: string;
  workspaceId: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes: number;
  language: string;
  folderId?: string | null;
}): Promise<BeginReadingUploadResult> {
  const validated = validateReadingUploadFile({
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  if (!validated.ok) {
    throw new ReadingError(validated.code);
  }

  const sourceType = readingSourceTypeFromMime(validated.mimeType);
  const title = titleFromFilename(validated.safeFilename);

  const [row] = await db
    .insert(readingPassages)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      title,
      body: "",
      language: input.language.trim() || "en",
      sourceType,
      sourceFilename: validated.safeFilename,
      wordCount: 0,
      contentVersion: 1,
      folderId: input.folderId ?? null,
      storageProvider: READING_STORAGE_PROVIDER,
      storagePath: null,
      mimeType: validated.mimeType,
      sizeBytes: input.sizeBytes,
      uploadStatus: "uploading",
    })
    .returning();

  const pathname = buildReadingBlobPathname({
    userId: input.userId,
    documentId: row.id,
    filename: validated.safeFilename,
  });

  // Persist expected pathname early so token checks and retries are stable.
  await db
    .update(readingPassages)
    .set({ storagePath: pathname, updatedAt: new Date() })
    .where(eq(readingPassages.id, row.id));

  return {
    documentId: row.id,
    pathname,
    mimeType: validated.mimeType,
    sizeBytes: input.sizeBytes,
    originalFileName: validated.safeFilename,
  };
}

export async function loadOwnedReadingDocument(input: {
  documentId: string;
  userId: string;
}) {
  return db.query.readingPassages.findFirst({
    where: and(
      eq(readingPassages.id, input.documentId),
      eq(readingPassages.userId, input.userId),
    ),
  });
}

export async function completeReadingDocumentUpload(input: {
  documentId: string;
  userId: string;
  storagePath: string;
  sizeBytes: number;
  mimeType?: string | null;
}): Promise<{
  documentId: string;
  title: string;
  body: string;
  sourceType: "pdf" | "docx";
  sourceFilename: string | null;
  wordCount: number;
  valid: boolean;
  errorCode: string | null;
  truncated: boolean;
  uploadStatus: "ready" | "processing";
  inProgress?: boolean;
}> {
  const passage = await loadOwnedReadingDocument({
    documentId: input.documentId,
    userId: input.userId,
  });
  if (!passage) throw new ReadingError("PASSAGE_NOT_FOUND");

  if (
    !isOwnedReadingBlobPathname(
      input.storagePath,
      input.userId,
      input.documentId,
    )
  ) {
    throw new ReadingError("UNAUTHORIZED");
  }

  // Idempotent: already ready with same path — return current extract fields.
  if (
    passage.uploadStatus === "ready" &&
    passage.storagePath === input.storagePath &&
    passage.body.trim().length > 0
  ) {
    return {
      documentId: passage.id,
      title: passage.title,
      body: passage.body,
      sourceType: passage.sourceType === "docx" ? "docx" : "pdf",
      sourceFilename: passage.sourceFilename,
      wordCount: passage.wordCount,
      valid: passage.body.trim().length >= 40,
      errorCode: null,
      truncated: false,
      uploadStatus: "ready",
    };
  }

  const outcome = await runExclusiveJob({
    operation: AI_JOBS.readingOcr,
    subjectId: passage.id,
    run: async ({ stillOwner }) => {
      await db
        .update(readingPassages)
        .set({
          storageProvider: READING_STORAGE_PROVIDER,
          storagePath: input.storagePath,
          mimeType: input.mimeType ?? passage.mimeType,
          sizeBytes: input.sizeBytes,
          uploadStatus: "ready",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(readingPassages.id, passage.id),
            eq(readingPassages.userId, input.userId),
          ),
        );

      let title = passage.title;
      let body = passage.body;
      let wordCount = passage.wordCount;
      let valid = body.trim().length >= 40;
      let errorCode: string | null = null;
      let truncated = false;
      let sourceType: "pdf" | "docx" =
        passage.sourceType === "docx" ? "docx" : "pdf";
      let sourceFilename = passage.sourceFilename;

      try {
        const { buffer, contentType } = await downloadReadingBlob(
          input.storagePath,
        );
        const user = await loadEntitlementUser(input.userId);
        if (!user) throw new ReadingError("UNAUTHORIZED");

        let releaseAbuse: (() => void) | undefined;
        let reservationId: string | null = null;
        let ocrStarted = false;

        try {
          const { extractReadingDocument } = await import(
            "@/lib/reading/extract"
          );
          const extracted = await extractReadingDocument({
            buffer,
            filename: passage.sourceFilename || "document.pdf",
            mimeType: input.mimeType ?? contentType ?? passage.mimeType,
            beforeOcr: async () => {
              const gate = beginAiAbuseControl(user.id, "reading_ocr");
              releaseAbuse = gate.release;
              const reservation = await consumeUsage(
                user,
                "ai_reading",
                `reading-ocr:${passage.id}`,
              );
              reservationId = reservation.reservationId;
              ocrStarted = true;
            },
          });
          if (!(await stillOwner())) throw new JobLockLostError();

          if (ocrStarted) {
            await finalizeUsageReservation(reservationId);
          }

          const validated = validatePassageBody(extracted.text);
          body = validated.normalized || extracted.text;
          title = normalizePassageTitle(
            extracted.suggestedTitle || passage.title,
            body,
          );
          wordCount = validated.wordCount || extracted.wordCount;
          valid = validated.ok;
          errorCode = validated.ok ? null : validated.code;
          truncated = Boolean(extracted.truncated);
          sourceType = extracted.sourceType;
          sourceFilename = extracted.sourceFilename;

          await db
            .update(readingPassages)
            .set({
              title,
              body,
              wordCount,
              sourceType,
              sourceFilename,
              mimeType: input.mimeType ?? contentType ?? passage.mimeType,
              updatedAt: new Date(),
            })
            .where(eq(readingPassages.id, passage.id));

          if (truncated && !errorCode) {
            errorCode = "EXTRACT_TRUNCATED";
          }
        } catch (error) {
          if (ocrStarted) {
            if (shouldRefundUsage(error)) {
              await refundUsageReservation(reservationId);
            } else {
              await finalizeUsageReservation(reservationId);
            }
          }
          throw error;
        } finally {
          releaseAbuse?.();
        }
      } catch (error) {
        if (error instanceof JobLockLostError) throw error;
        if (error instanceof QuotaExceededError) {
          errorCode = "AI_QUOTA_EXCEEDED";
        } else if (isRateLimitedError(error)) {
          errorCode = "RATE_LIMITED";
        } else if (isAiBusyError(error)) {
          errorCode = "AI_BUSY";
        } else if (error instanceof ReadingError) {
          errorCode = error.code;
        } else {
          errorCode = "EXTRACT_UNAVAILABLE";
        }
      }

      return {
        documentId: passage.id,
        title,
        body,
        sourceType,
        sourceFilename,
        wordCount,
        valid,
        errorCode,
        truncated,
        uploadStatus: "ready" as const,
        inProgress: false,
      };
    },
  });

  if (outcome.status === "in_progress") {
    return {
      documentId: passage.id,
      title: passage.title,
      body: passage.body,
      sourceType: passage.sourceType === "docx" ? "docx" : "pdf",
      sourceFilename: passage.sourceFilename,
      wordCount: passage.wordCount,
      valid: passage.body.trim().length >= 40,
      errorCode: null,
      truncated: false,
      uploadStatus: "processing",
      inProgress: true,
    };
  }
  return outcome.result;
}

export async function failReadingDocumentUpload(input: {
  documentId: string;
  userId: string;
}): Promise<void> {
  const passage = await loadOwnedReadingDocument({
    documentId: input.documentId,
    userId: input.userId,
  });
  if (!passage) return;

  // Only clean transient upload rows — never wipe a ready passage.
  if (passage.uploadStatus === "ready" && passage.body.trim().length > 0) {
    return;
  }

  await forceReleaseJobLock(AI_JOBS.readingOcr, passage.id);
  await deleteReadingBlob(passage.storagePath);
  await db
    .delete(readingPassages)
    .where(
      and(
        eq(readingPassages.id, passage.id),
        eq(readingPassages.userId, input.userId),
      ),
    );
}
