"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyWords, workspaces } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  AccountBackupParseError,
  MAX_ACCOUNT_BACKUP_BYTES,
  buildBackupPreview,
  parseAccountBackupJson,
  type BackupImportResult,
  type BackupPreview,
} from "@/lib/account-backup";
import {
  buildAccountBackupBlobPathname,
  isOwnedAccountBackupBlobPathname,
  newAccountBackupUploadId,
  sanitizeBackupFilename,
} from "@/lib/account-backup/blob-path";
import { importAccountBackupLearningData } from "@/lib/account-backup/import";
import { deleteReadingBlob, downloadReadingBlob } from "@/lib/reading/blob";

export type AccountBackupActionError =
  | { code: "UNAUTHORIZED" }
  | { code: "INVALID_INPUT" }
  | { code: "FILE_TOO_LARGE" }
  | { code: "STORAGE_NOT_CONFIGURED" }
  | { code: "INVALID_BACKUP"; message: string }
  | { code: "IMPORT_FAILED"; message?: string }
  | { code: "REQUEST_TOO_LARGE" }
  /** @deprecated Prefer STORAGE_NOT_CONFIGURED */
  | { code: "CLOUDINARY_NOT_CONFIGURED" };

export type AnalyzeAccountBackupResult = {
  preview: BackupPreview;
  /** Temporary private Blob pathname — reuse for confirm, then deleted. */
  storagePath: string;
  /** @deprecated Alias of storagePath for older UI. */
  uploadPublicId: string;
};

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function destroyBackupBlob(storagePath: string) {
  await deleteReadingBlob(storagePath);
}

async function loadBackupTextFromBlob(
  userId: string,
  storagePath: string,
): Promise<
  | { ok: true; text: string }
  | { ok: false; error: AccountBackupActionError }
> {
  const trimmed = storagePath.trim();
  if (!trimmed || !isOwnedAccountBackupBlobPathname(trimmed, userId)) {
    return { ok: false, error: { code: "INVALID_INPUT" } };
  }

  try {
    const { buffer } = await downloadReadingBlob(trimmed);
    if (buffer.byteLength > MAX_ACCOUNT_BACKUP_BYTES) {
      await destroyBackupBlob(trimmed);
      return { ok: false, error: { code: "FILE_TOO_LARGE" } };
    }
    if (buffer.byteLength <= 0) {
      await destroyBackupBlob(trimmed);
      return {
        ok: false,
        error: {
          code: "INVALID_BACKUP",
          message: "The file is empty.",
        },
      };
    }
    return { ok: true, text: buffer.toString("utf8") };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

/** Reserve a private Blob pathname for a direct browser backup upload. */
export async function beginAccountBackupUpload(input: {
  filename?: string;
  byteSize?: number;
}) {
  try {
    if (!isBlobConfigured()) {
      return {
        ok: false as const,
        error: { code: "STORAGE_NOT_CONFIGURED" as const },
      };
    }

    if (
      typeof input.byteSize === "number" &&
      input.byteSize > MAX_ACCOUNT_BACKUP_BYTES
    ) {
      return { ok: false as const, error: { code: "FILE_TOO_LARGE" as const } };
    }

    const userId = await getCurrentUserId();
    const uploadId = newAccountBackupUploadId();
    const filename = sanitizeBackupFilename(
      input.filename?.trim() || "notoria-backup.json",
    );
    const pathname = buildAccountBackupBlobPathname({
      userId,
      uploadId,
      filename,
    });

    return {
      ok: true as const,
      result: {
        uploadId,
        pathname,
        filename,
        maxBytes: MAX_ACCOUNT_BACKUP_BYTES,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false as const, error: { code: "UNAUTHORIZED" as const } };
    }
    return {
      ok: false as const,
      error: {
        code: "IMPORT_FAILED" as const,
        message: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

/** @deprecated Use beginAccountBackupUpload — backups now use Vercel Blob. */
export async function getAccountBackupUploadSignature(input: {
  filename?: string;
  byteSize?: number;
}) {
  return beginAccountBackupUpload(input);
}

export async function analyzeAccountBackupFromUpload(input: {
  storagePath?: string;
  /** @deprecated Prefer storagePath */
  publicId?: string;
  fileUrl?: string;
  byteSize?: number;
}): Promise<
  | { ok: true; result: AnalyzeAccountBackupResult }
  | { ok: false; error: AccountBackupActionError }
> {
  const storagePath = (input.storagePath || input.publicId || "").trim();
  try {
    const userId = await getCurrentUserId();

    if (
      typeof input.byteSize === "number" &&
      input.byteSize > MAX_ACCOUNT_BACKUP_BYTES
    ) {
      await destroyBackupBlob(storagePath);
      return { ok: false, error: { code: "FILE_TOO_LARGE" } };
    }

    const loaded = await loadBackupTextFromBlob(userId, storagePath);
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
      await destroyBackupBlob(storagePath);
      const message =
        error instanceof AccountBackupParseError
          ? error.message
          : "This doesn't look like a valid Notoria backup. Please use a JSON file exported from Notoria's Export account backup feature.";
      return { ok: false, error: { code: "INVALID_BACKUP", message } };
    }

    const existingWorkspaces = await db.query.workspaces.findMany({
      where: eq(workspaces.userId, userId),
      columns: { id: true, language: true },
    });

    const existingVocab =
      existingWorkspaces.length > 0
        ? await db.query.vocabularyWords.findMany({
            where: eq(vocabularyWords.userId, userId),
            columns: {
              workspaceId: true,
              word: true,
              partOfSpeech: true,
            },
          })
        : [];

    const preview = buildBackupPreview(
      backup,
      existingWorkspaces,
      existingVocab.map((row) => ({
        workspaceId: row.workspaceId,
        word: row.word,
        partOfSpeech: row.partOfSpeech ?? "",
      })),
    );

    return {
      ok: true,
      result: {
        preview,
        storagePath,
        uploadPublicId: storagePath,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, error: { code: "UNAUTHORIZED" } };
    }
    return {
      ok: false,
      error: {
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

export async function confirmAccountBackupFromUpload(input: {
  storagePath?: string;
  /** @deprecated Prefer storagePath */
  publicId?: string;
  fileUrl?: string;
}): Promise<
  | { ok: true; result: BackupImportResult }
  | { ok: false; error: AccountBackupActionError }
> {
  const storagePath = (input.storagePath || input.publicId || "").trim();
  try {
    const userId = await getCurrentUserId();
    const loaded = await loadBackupTextFromBlob(userId, storagePath);
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
      await destroyBackupBlob(storagePath);
      const message =
        error instanceof AccountBackupParseError
          ? error.message
          : "This doesn't look like a valid Notoria backup.";
      return { ok: false, error: { code: "INVALID_BACKUP", message } };
    }

    const result = await importAccountBackupLearningData({
      userId,
      backup,
    });
    await destroyBackupBlob(storagePath);

    revalidatePath("/");
    revalidatePath("/vocabulary");
    revalidatePath("/theory");
    revalidatePath("/writing");
    revalidatePath("/exercises");
    revalidatePath("/listening");
    revalidatePath("/speaking");
    revalidatePath("/account");
    revalidatePath("/dashboard");

    return { ok: true, result };
  } catch (error) {
    await destroyBackupBlob(storagePath);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, error: { code: "UNAUTHORIZED" } };
    }
    return {
      ok: false,
      error: {
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : undefined,
      },
    };
  }
}

/** @deprecated Use Blob direct upload helpers — FormData hits Vercel 413. */
export async function analyzeAccountBackup(formData: FormData): Promise<
  | { ok: true; result: AnalyzeAccountBackupResult }
  | { ok: false; error: AccountBackupActionError }
> {
  void formData;
  return {
    ok: false,
    error: { code: "REQUEST_TOO_LARGE" },
  };
}

/** @deprecated Use Blob direct upload helpers — FormData hits Vercel 413. */
export async function confirmAccountBackupImport(formData: FormData): Promise<
  | { ok: true; result: BackupImportResult }
  | { ok: false; error: AccountBackupActionError }
> {
  void formData;
  return {
    ok: false,
    error: { code: "REQUEST_TOO_LARGE" },
  };
}
