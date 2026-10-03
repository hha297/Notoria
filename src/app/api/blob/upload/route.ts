import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOwnedAccountBackupBlobPathname } from "@/lib/account-backup/blob-path";
import { MAX_ACCOUNT_BACKUP_BYTES } from "@/lib/account-backup/types";
import { loadOwnedReadingDocument } from "@/lib/reading/document-upload";
import {
  isOwnedReadingBlobPathname,
  MAX_READING_FILE_SIZE_BYTES,
  READING_ALLOWED_MIME_TYPES,
} from "@/lib/reading/storage";

export const runtime = "nodejs";

type ClientPayload = {
  purpose?: "reading" | "account-backup";
  documentId?: string;
  uploadId?: string;
};

/**
 * Client-token exchange for direct browser → private Vercel Blob uploads.
 * Uses BLOB_READ_WRITE_TOKEN (required by handleUpload). File never hits this route.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          throw new Error("UNAUTHORIZED");
        }

        let payload: ClientPayload = {};
        try {
          payload = clientPayload
            ? (JSON.parse(clientPayload) as ClientPayload)
            : {};
        } catch {
          throw new Error("INVALID_INPUT");
        }

        const purpose = payload.purpose ?? "reading";

        if (purpose === "account-backup") {
          const uploadId = payload.uploadId?.trim() ?? "";
          if (!uploadId) throw new Error("INVALID_INPUT");
          if (!isOwnedAccountBackupBlobPathname(pathname, userId, uploadId)) {
            throw new Error("UNAUTHORIZED");
          }

          return {
            allowedContentTypes: [
              "application/json",
              "application/octet-stream",
              "text/plain",
            ],
            maximumSizeInBytes: MAX_ACCOUNT_BACKUP_BYTES,
            addRandomSuffix: false,
            allowOverwrite: true,
            tokenPayload: JSON.stringify({ userId, purpose, uploadId }),
          };
        }

        const documentId = payload.documentId?.trim() ?? "";
        if (!documentId) {
          throw new Error("INVALID_INPUT");
        }

        if (!isOwnedReadingBlobPathname(pathname, userId, documentId)) {
          throw new Error("UNAUTHORIZED");
        }

        const document = await loadOwnedReadingDocument({
          documentId,
          userId,
        });
        if (!document || document.uploadStatus === "failed") {
          throw new Error("PASSAGE_NOT_FOUND");
        }
        if (
          document.storagePath &&
          document.storagePath !== pathname &&
          document.uploadStatus === "uploading"
        ) {
          throw new Error("UNAUTHORIZED");
        }

        return {
          allowedContentTypes: [...READING_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: MAX_READING_FILE_SIZE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ userId, documentId, purpose }),
        };
      },
      onUploadCompleted: async () => {
        // App confirms via dedicated complete/analyze endpoints.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "UPLOAD_FAILED";
    const status =
      message === "UNAUTHORIZED"
        ? 401
        : message === "PASSAGE_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: message, code: message }, { status });
  }
}
