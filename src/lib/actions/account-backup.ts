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
import { importAccountBackupLearningData } from "@/lib/account-backup/import";
import {
  configureCloudinary,
  downloadCloudinaryAsset,
  getAccountBackupFolder,
  getCloudinaryPublicConfig,
  isCloudinaryConfigured,
  signCloudinaryUploadParams,
} from "@/lib/cloudinary";

export type AccountBackupActionError =
  | { code: "UNAUTHORIZED" }
  | { code: "INVALID_INPUT" }
  | { code: "FILE_TOO_LARGE" }
  | { code: "CLOUDINARY_NOT_CONFIGURED" }
  | { code: "INVALID_BACKUP"; message: string }
  | { code: "IMPORT_FAILED"; message?: string }
  | { code: "REQUEST_TOO_LARGE" };

export type AnalyzeAccountBackupResult = {
  preview: BackupPreview;
  /** Temporary Cloudinary public id — reuse for confirm, then deleted. */
  uploadPublicId: string;
};

function isOwnedBackupPublicId(userId: string, publicId: string) {
  const folder = getAccountBackupFolder(userId);
  return publicId === folder || publicId.startsWith(`${folder}/`);
}

async function destroyBackupAsset(publicId: string) {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
      invalidate: true,
    });
  } catch {
    // best-effort cleanup
  }
}

async function loadBackupTextFromCloudinary(
  userId: string,
  publicId: string,
  fallbackUrl?: string | null,
): Promise<
  | { ok: true; text: string }
  | { ok: false; error: AccountBackupActionError }
> {
  const trimmed = publicId.trim();
  if (!trimmed || !isOwnedBackupPublicId(userId, trimmed)) {
    return { ok: false, error: { code: "INVALID_INPUT" } };
  }

  try {
    const buffer = await downloadCloudinaryAsset({
      publicId: trimmed,
      resourceType: "raw",
      fallbackUrl,
    });
    if (buffer.byteLength > MAX_ACCOUNT_BACKUP_BYTES) {
      await destroyBackupAsset(trimmed);
      return { ok: false, error: { code: "FILE_TOO_LARGE" } };
    }
    if (buffer.byteLength <= 0) {
      await destroyBackupAsset(trimmed);
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

/** Signed params so the browser can upload a backup JSON directly to Cloudinary. */
export async function getAccountBackupUploadSignature(input: {
  filename?: string;
  byteSize?: number;
}) {
  try {
    if (!isCloudinaryConfigured()) {
      return {
        ok: false as const,
        error: { code: "CLOUDINARY_NOT_CONFIGURED" as const },
      };
    }

    if (
      typeof input.byteSize === "number" &&
      input.byteSize > MAX_ACCOUNT_BACKUP_BYTES
    ) {
      return { ok: false as const, error: { code: "FILE_TOO_LARGE" as const } };
    }

    const userId = await getCurrentUserId();
    const { cloudName, apiKey } = getCloudinaryPublicConfig();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = getAccountBackupFolder(userId);

    const signature = signCloudinaryUploadParams({
      folder,
      timestamp,
      unique_filename: "true",
      use_filename: "true",
    });

    return {
      ok: true as const,
      result: {
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
        resourceType: "raw" as const,
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

export async function analyzeAccountBackupFromUpload(input: {
  publicId: string;
  fileUrl?: string;
  byteSize?: number;
}): Promise<
  | { ok: true; result: AnalyzeAccountBackupResult }
  | { ok: false; error: AccountBackupActionError }
> {
  try {
    const userId = await getCurrentUserId();

    if (
      typeof input.byteSize === "number" &&
      input.byteSize > MAX_ACCOUNT_BACKUP_BYTES
    ) {
      await destroyBackupAsset(input.publicId);
      return { ok: false, error: { code: "FILE_TOO_LARGE" } };
    }

    const loaded = await loadBackupTextFromCloudinary(
      userId,
      input.publicId,
      input.fileUrl,
    );
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
      await destroyBackupAsset(input.publicId);
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
      result: { preview, uploadPublicId: input.publicId.trim() },
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
  publicId: string;
  fileUrl?: string;
}): Promise<
  | { ok: true; result: BackupImportResult }
  | { ok: false; error: AccountBackupActionError }
> {
  try {
    const userId = await getCurrentUserId();
    const loaded = await loadBackupTextFromCloudinary(
      userId,
      input.publicId,
      input.fileUrl,
    );
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
      await destroyBackupAsset(input.publicId);
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
    await destroyBackupAsset(input.publicId);

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
    await destroyBackupAsset(input.publicId);
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

/** @deprecated Use Cloudinary direct upload helpers — FormData hits Vercel 413. */
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

/** @deprecated Use Cloudinary direct upload helpers — FormData hits Vercel 413. */
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
