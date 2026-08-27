"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exerciseImports, importedExercises } from "@/db/schema";
import { requireProAccess } from "@/lib/auth/pro-access";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  configureCloudinary,
  getCloudinaryPublicConfig,
  getExerciseImportFolder,
  isCloudinaryConfigured,
  signCloudinaryUploadParams,
} from "@/lib/cloudinary";
import {
  ExerciseImportError,
  toExerciseImportError,
} from "@/lib/exercise-import/errors";
import { extractImportContent } from "@/lib/exercise-import/extract";
import { generateExercisesFromImport } from "@/lib/exercise-import/generate";
import {
  toImportDetail,
  toImportListItem,
} from "@/lib/exercise-import/serialize";
import type {
  ExerciseImportDetail,
  ExerciseImportListItem,
  ImportSourceInput,
} from "@/lib/exercise-import/types";
import {
  isAllowedImportFile,
  isImageMime,
  isValidHttpUrl,
  MAX_IMPORT_FILE_SIZE,
  resolveImportMime,
  sourceTypeFromMime,
  titleFromFilename,
  titleFromUrl,
} from "@/lib/exercise-import/utils";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";

/** Prefer chunked Cloudinary upload for large assets (default chunk ≈ 20 MB). */
const CHUNKED_UPLOAD_THRESHOLD = 20 * 1024 * 1024;

function revalidateImports(id?: string) {
  revalidatePath("/exercises");
  if (id) {
    revalidatePath(`/exercises/import/${id}`);
  }
}

async function requireOwnedImport(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const row = await db.query.exerciseImports.findFirst({
    where: eq(exerciseImports.id, id),
    with: {
      exercises: true,
    },
  });

  if (!row || row.userId !== userId || row.workspaceId !== workspace.id) {
    throw new ExerciseImportError("IMPORT_NOT_FOUND");
  }

  return { row, userId, workspace };
}

async function markImportFailed(id: string, error: unknown) {
  const importError = toExerciseImportError(error);
  await db
    .update(exerciseImports)
    .set({
      status: "FAILED",
      errorCode: importError.code,
      updatedAt: new Date(),
    })
    .where(eq(exerciseImports.id, id));
  revalidateImports(id);
  return importError;
}

async function writeFileToUploadStream(
  file: File,
  upload: NodeJS.WritableStream,
) {
  const reader = file.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      const canContinue = upload.write(chunk);
      if (!canContinue) {
        await new Promise<void>((resolve, reject) => {
          upload.once("drain", resolve);
          upload.once("error", reject);
        });
      }
    }
    upload.end();
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream the File to Cloudinary in chunks (no full in-memory copy).
 * Large files use Cloudinary chunked upload; smaller ones use upload_stream.
 */
async function uploadImportAsset(input: {
  file: File;
  userId: string;
  workspaceId: string;
  mimeType: string;
}) {
  if (!isCloudinaryConfigured()) {
    throw new ExerciseImportError("CLOUDINARY_NOT_CONFIGURED");
  }

  const cloudinary = configureCloudinary();
  const resourceType = input.mimeType.startsWith("image/")
    ? "image"
    : "raw";
  const folder = getExerciseImportFolder(input.userId, input.workspaceId);
  const useChunked = input.file.size > CHUNKED_UPLOAD_THRESHOLD;
  const options = {
    folder,
    resource_type: resourceType,
    overwrite: false,
    filename_override: input.file.name || undefined,
    use_filename: true,
    unique_filename: true,
  } as const;

  return new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    let settled = false;
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      console.error("[exercise-import] Cloudinary upload failed", {
        mimeType: input.mimeType,
        size: input.file.size,
        resourceType,
        useChunked,
        reason,
      });
      reject(new ExerciseImportError("PROCESSING_FAILED"));
    };

    const onDone = (
      error: unknown,
      uploadResult: { secure_url?: string; public_id?: string } | undefined,
    ) => {
      if (error || !uploadResult?.secure_url || !uploadResult.public_id) {
        fail(error ?? uploadResult);
        return;
      }
      if (settled) return;
      settled = true;
      resolve({
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      });
    };

    const upload = useChunked
      ? cloudinary.uploader.upload_chunked_stream(
          {
            ...options,
            chunk_size: CHUNKED_UPLOAD_THRESHOLD,
          },
          onDone,
        )
      : cloudinary.uploader.upload_stream({ ...options }, onDone);

    upload.on("error", fail);

    void writeFileToUploadStream(input.file, upload).catch(fail);
  });
}

async function destroyImportAsset(
  publicId: string | null,
  mimeType: string | null,
) {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: mimeType?.startsWith("image/") ? "image" : "raw",
      invalidate: true,
    });
  } catch {
    // Keep DB delete even if Cloudinary cleanup fails.
  }
}

function toSourceInput(row: {
  sourceType: "image" | "file" | "url";
  fileUrl: string | null;
  filePublicId?: string | null;
  sourceUrl: string | null;
  mimeType: string | null;
  originalFilename: string | null;
}): ImportSourceInput {
  if (row.sourceType === "url") {
    if (!row.sourceUrl) {
      throw new ExerciseImportError("INVALID_URL");
    }
    return { kind: "url", sourceUrl: row.sourceUrl };
  }
  if (!row.fileUrl) {
    throw new ExerciseImportError("INVALID_FILE");
  }
  return {
    kind: row.sourceType,
    fileUrl: row.fileUrl,
    filePublicId: row.filePublicId ?? null,
    mimeType: row.mimeType,
    originalFilename: row.originalFilename,
  };
}

export async function getExerciseImports(): Promise<ExerciseImportListItem[]> {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return [];

  const rows = await db.query.exerciseImports.findMany({
    where: and(
      eq(exerciseImports.userId, userId),
      eq(exerciseImports.workspaceId, workspace.id),
    ),
    orderBy: [desc(exerciseImports.createdAt)],
    with: {
      exercises: {
        columns: { id: true },
      },
    },
  });

  return rows.map(toImportListItem);
}

export async function getExerciseImport(
  id: string,
): Promise<ExerciseImportDetail | null> {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();
  if (!workspace) return null;

  const row = await db.query.exerciseImports.findFirst({
    where: and(
      eq(exerciseImports.id, id),
      eq(exerciseImports.userId, userId),
      eq(exerciseImports.workspaceId, workspace.id),
    ),
    with: {
      exercises: true,
    },
  });

  if (!row) return null;
  return toImportDetail(row);
}

/** Signed params so the browser can upload directly to Cloudinary with XHR progress. */
export async function getImportUploadSignature(input: {
  mimeType: string;
  filename?: string;
}) {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  if (!isCloudinaryConfigured()) {
    throw new ExerciseImportError("CLOUDINARY_NOT_CONFIGURED");
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!mimeType) {
    throw new ExerciseImportError("INVALID_FILE_TYPE");
  }

  const { cloudName, apiKey } = getCloudinaryPublicConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = getExerciseImportFolder(userId, workspace.id);
  const resourceType = mimeType.startsWith("image/") ? "image" : "raw";

  // Sign with string "true" so params match FormData fields in the client upload.
  const signature = signCloudinaryUploadParams({
    folder,
    timestamp,
    unique_filename: "true",
    use_filename: "true",
  });

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: resourceType as "image" | "raw",
  };
}

/** Persist an import row after a successful direct Cloudinary upload. */
export async function createExerciseImportFromUploadedAsset(input: {
  fileUrl: string;
  filePublicId: string;
  mimeType: string;
  originalFilename: string;
  title?: string;
  byteSize?: number;
}) {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const fileUrl = input.fileUrl.trim();
  const filePublicId = input.filePublicId.trim();
  if (!fileUrl || !filePublicId) {
    throw new ExerciseImportError("PROCESSING_FAILED");
  }

  if (
    typeof input.byteSize === "number" &&
    input.byteSize > MAX_IMPORT_FILE_SIZE
  ) {
    throw new ExerciseImportError("FILE_TOO_LARGE");
  }

  const mimeType = input.mimeType || "application/octet-stream";
  const originalFilename = input.originalFilename.slice(0, 255) || "upload";
  const probe = new File(["x"], originalFilename, { type: mimeType });
  if (!isAllowedImportFile(probe)) {
    throw new ExerciseImportError("INVALID_FILE_TYPE");
  }

  const sourceType = isImageMime(resolveImportMime(probe))
    ? "image"
    : sourceTypeFromMime(resolveImportMime(probe));
  const title =
    input.title?.trim().slice(0, 200) || titleFromFilename(originalFilename);

  const [created] = await db
    .insert(exerciseImports)
    .values({
      userId,
      workspaceId: workspace.id,
      sourceType,
      title,
      originalFilename,
      fileUrl,
      filePublicId,
      mimeType,
      status: "UPLOADING",
    })
    .returning({ id: exerciseImports.id });

  revalidateImports(created.id);
  return { id: created.id };
}

export async function createExerciseImportFromFile(formData: FormData) {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ExerciseImportError("INVALID_FILE");
  }
  if (!isAllowedImportFile(file)) {
    throw new ExerciseImportError("INVALID_FILE_TYPE");
  }
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new ExerciseImportError("FILE_TOO_LARGE");
  }

  const mimeType = resolveImportMime(file);
  const sourceType = isImageMime(mimeType)
    ? "image"
    : sourceTypeFromMime(mimeType);
  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : titleFromFilename(file.name);

  const uploaded = await uploadImportAsset({
    file,
    userId,
    workspaceId: workspace.id,
    mimeType,
  });

  const [created] = await db
    .insert(exerciseImports)
    .values({
      userId,
      workspaceId: workspace.id,
      sourceType,
      title,
      originalFilename: file.name.slice(0, 255),
      fileUrl: uploaded.secure_url,
      filePublicId: uploaded.public_id,
      mimeType,
      status: "UPLOADING",
    })
    .returning({ id: exerciseImports.id });

  revalidateImports(created.id);
  return { id: created.id };
}

export async function createExerciseImportFromUrl(formData: FormData) {
  await requireProAccess();
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const urlRaw = formData.get("url");
  const url = typeof urlRaw === "string" ? urlRaw.trim() : "";
  if (!url || !isValidHttpUrl(url)) {
    throw new ExerciseImportError("INVALID_URL");
  }

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim().slice(0, 200)
      : titleFromUrl(url);

  const [created] = await db
    .insert(exerciseImports)
    .values({
      userId,
      workspaceId: workspace.id,
      sourceType: "url",
      title,
      sourceUrl: url.slice(0, 2000),
      status: "UPLOADING",
    })
    .returning({ id: exerciseImports.id });

  revalidateImports(created.id);
  return { id: created.id };
}

/**
 * Extract content from the imported source (internal). No exercise generation.
 */
export async function extractExerciseImport(id: string) {
  await requireProAccess();
  const { row } = await requireOwnedImport(id);

  if (row.status === "COMPLETED" && row.exercises.length > 0) {
    return { id: row.id, status: "COMPLETED" as const };
  }

  if (row.status === "EXTRACTING" || row.status === "GENERATING") {
    throw new ExerciseImportError("ALREADY_PROCESSING");
  }

  try {
    await db
      .update(exerciseImports)
      .set({
        status: "EXTRACTING",
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(exerciseImports.id, id));
    revalidateImports(id);

    const extracted = await extractImportContent(toSourceInput(row));

    await db
      .update(exerciseImports)
      .set({
        status: "ANALYZING",
        extractedText: extracted.text.slice(0, 100_000),
        updatedAt: new Date(),
      })
      .where(eq(exerciseImports.id, id));
    revalidateImports(id);

    return { id, status: "ANALYZING" as const };
  } catch (error) {
    const failed = await markImportFailed(id, error);
    throw failed;
  }
}

/**
 * Generate and persist exercises from already-extracted import text.
 */
export async function generateExerciseImportExercises(id: string) {
  await requireProAccess();
  const { row, workspace } = await requireOwnedImport(id);

  if (row.status === "COMPLETED" && row.exercises.length > 0) {
    return { id: row.id, status: "COMPLETED" as const };
  }

  const text = row.extractedText?.trim() ?? "";
  if (!text) {
    throw new ExerciseImportError("EMPTY_CONTENT");
  }

  try {
    await db
      .update(exerciseImports)
      .set({
        status: "GENERATING",
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(exerciseImports.id, id));
    revalidateImports(id);

    const exercises = await generateExercisesFromImport({
      importId: id,
      title: row.title,
      extractedText: text,
      studyLanguage: workspace.language,
    });

    if (exercises.length === 0) {
      throw new ExerciseImportError("GENERATION_FAILED");
    }

    await db.delete(importedExercises).where(eq(importedExercises.importId, id));
    await db.insert(importedExercises).values(
      exercises.map((exercise, index) => ({
        importId: id,
        type: exercise.type,
        data: exercise,
        sortOrder: index,
      })),
    );

    await db
      .update(exerciseImports)
      .set({
        status: "COMPLETED",
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(exerciseImports.id, id));

    revalidateImports(id);
    return { id, status: "COMPLETED" as const };
  } catch (error) {
    const failed = await markImportFailed(id, error);
    throw failed;
  }
}

/**
 * Extract content → generate exercises → persist.
 * Prefer calling extract + generate separately from the client for status UI.
 */
export async function processExerciseImport(id: string) {
  await extractExerciseImport(id);
  return generateExerciseImportExercises(id);
}

export async function deleteExerciseImport(id: string) {
  await requireProAccess();
  const { row } = await requireOwnedImport(id);

  await db.delete(exerciseImports).where(eq(exerciseImports.id, id));
  await destroyImportAsset(row.filePublicId, row.mimeType);
  revalidateImports();
  return { ok: true as const };
}

export async function retryExerciseImport(id: string) {
  await requireProAccess();
  const { row } = await requireOwnedImport(id);

  const canRetry =
    row.status === "FAILED" ||
    (row.status === "COMPLETED" && row.exercises.length === 0);

  if (!canRetry) {
    throw new ExerciseImportError("ALREADY_PROCESSING");
  }

  await db
    .update(exerciseImports)
    .set({
      status: "UPLOADING",
      errorCode: null,
      extractedText: null,
      analysis: null,
      updatedAt: new Date(),
    })
    .where(eq(exerciseImports.id, id));

  await db.delete(importedExercises).where(eq(importedExercises.importId, id));

  return processExerciseImport(id);
}
