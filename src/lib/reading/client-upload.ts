"use client";

import { upload } from "@vercel/blob/client";
import {
  MAX_READING_FILE_SIZE_BYTES,
  READING_MULTIPART_THRESHOLD_BYTES,
  validateReadingUploadFile,
} from "@/lib/reading/storage";

export type ReadingUploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export class ReadingUploadCancelledError extends Error {
  constructor() {
    super("UPLOAD_CANCELLED");
    this.name = "ReadingUploadCancelledError";
  }
}

export function assertReadableReadingFile(file: File) {
  return validateReadingUploadFile({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}

export async function uploadReadingFileToBlob(input: {
  file: File;
  documentId: string;
  pathname: string;
  onProgress?: (progress: ReadingUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<{ pathname: string; url: string; contentType: string }> {
  if (input.signal?.aborted) {
    throw new ReadingUploadCancelledError();
  }

  const validated = assertReadableReadingFile(input.file);
  if (!validated.ok) {
    throw new Error(validated.code);
  }

  try {
    const result = await upload(input.pathname, input.file, {
      access: "private",
      handleUploadUrl: "/api/blob/upload",
      multipart: input.file.size >= READING_MULTIPART_THRESHOLD_BYTES,
      clientPayload: JSON.stringify({
        purpose: "reading",
        documentId: input.documentId,
      }),
      contentType: validated.mimeType,
      abortSignal: input.signal,
      onUploadProgress: (event) => {
        const total =
          event.total || input.file.size || MAX_READING_FILE_SIZE_BYTES;
        const loaded = event.loaded ?? 0;
        input.onProgress?.({
          loaded,
          total,
          percent:
            total > 0
              ? Math.min(
                  100,
                  Math.round(event.percentage ?? (loaded / total) * 100),
                )
              : 0,
        });
      },
    });

    input.onProgress?.({
      loaded: input.file.size,
      total: input.file.size,
      percent: 100,
    });

    return {
      pathname: result.pathname,
      url: result.url,
      contentType: result.contentType,
    };
  } catch (error) {
    if (
      input.signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ReadingUploadCancelledError();
    }
    if (error instanceof ReadingUploadCancelledError) throw error;
    if (error instanceof Error && error.message === "UPLOAD_CANCELLED") {
      throw new ReadingUploadCancelledError();
    }
    if (
      error instanceof TypeError ||
      (error instanceof Error &&
        /network|fetch|failed to fetch/i.test(error.message))
    ) {
      throw new Error("NETWORK_FAILED");
    }
    throw new Error("UPLOAD_FAILED");
  }
}

export async function completeReadingDocumentRequest(input: {
  documentId: string;
  storagePath: string;
  url?: string;
  sizeBytes: number;
  mimeType: string;
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
}> {
  const response = await fetch(
    `/api/reading/documents/${input.documentId}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: input.storagePath,
        url: input.url,
        sizeBytes: input.sizeBytes,
        mimeType: input.mimeType,
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    code?: string;
    error?: string;
    documentId?: string;
    title?: string;
    body?: string;
    sourceType?: "pdf" | "docx";
    sourceFilename?: string | null;
    wordCount?: number;
    valid?: boolean;
    errorCode?: string | null;
    truncated?: boolean;
  } | null;

  if (!response.ok) {
    throw new Error(data?.code || data?.error || "STORAGE_FAILED");
  }

  return {
    documentId: data?.documentId || input.documentId,
    title: data?.title || "",
    body: data?.body || "",
    sourceType: data?.sourceType || "pdf",
    sourceFilename: data?.sourceFilename ?? null,
    wordCount: data?.wordCount || 0,
    valid: Boolean(data?.valid),
    errorCode: data?.errorCode ?? null,
    truncated: Boolean(data?.truncated),
  };
}

export async function failReadingDocumentRequest(documentId: string) {
  try {
    await fetch(`/api/reading/documents/${documentId}/fail`, {
      method: "POST",
    });
  } catch {
    // Best-effort cleanup.
  }
}
