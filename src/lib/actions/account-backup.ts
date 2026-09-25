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

export type AccountBackupActionError =
  | { code: "UNAUTHORIZED" }
  | { code: "INVALID_INPUT" }
  | { code: "FILE_TOO_LARGE" }
  | { code: "INVALID_BACKUP"; message: string }
  | { code: "IMPORT_FAILED"; message?: string };

export type AnalyzeAccountBackupResult = {
  preview: BackupPreview;
};

async function loadBackupText(formData: FormData): Promise<
  | { ok: true; text: string }
  | { ok: false; error: AccountBackupActionError }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: { code: "INVALID_INPUT" } };
  }

  const name = (file.name || "backup.json").toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (!name.endsWith(".json") && type && !type.includes("json") && type !== "application/octet-stream") {
    return {
      ok: false,
      error: {
        code: "INVALID_BACKUP",
        message:
          "This doesn't look like a valid Notoria backup. Please use a JSON file exported from Notoria's Export account backup feature.",
      },
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_BACKUP",
        message: "The file is empty.",
      },
    };
  }

  if (file.size > MAX_ACCOUNT_BACKUP_BYTES) {
    return { ok: false, error: { code: "FILE_TOO_LARGE" } };
  }

  const text = await file.text();
  return { ok: true, text };
}

export async function analyzeAccountBackup(formData: FormData): Promise<
  | { ok: true; result: AnalyzeAccountBackupResult }
  | { ok: false; error: AccountBackupActionError }
> {
  try {
    const userId = await getCurrentUserId();
    const loaded = await loadBackupText(formData);
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
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

    return { ok: true, result: { preview } };
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

export async function confirmAccountBackupImport(formData: FormData): Promise<
  | { ok: true; result: BackupImportResult }
  | { ok: false; error: AccountBackupActionError }
> {
  try {
    const userId = await getCurrentUserId();
    const loaded = await loadBackupText(formData);
    if (!loaded.ok) return loaded;

    let backup;
    try {
      backup = parseAccountBackupJson(loaded.text);
    } catch (error) {
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, error: { code: "UNAUTHORIZED" } };
    }
    console.error("[account-backup] import failed", error);
    return {
      ok: false,
      error: {
        code: "IMPORT_FAILED",
        message: error instanceof Error ? error.message : undefined,
      },
    };
  }
}
