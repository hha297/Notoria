"use server";

import { getCurrentUserId } from "@/lib/auth/session";
import {
  configureCloudinary,
  getEditorImageFolder,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import {
  EDITOR_IMAGE_TYPES,
  MAX_EDITOR_IMAGE_BYTES,
  type EditorImageErrorCode,
} from "@/lib/editor/images";

export type UploadEditorImageResult =
  | { ok: true; url: string }
  | { ok: false; code: EditorImageErrorCode };

export async function uploadEditorImage(
  formData: FormData,
): Promise<UploadEditorImageResult> {
  try {
    const userId = await getCurrentUserId();

    if (!isCloudinaryConfigured()) {
      return { ok: false, code: "CLOUDINARY_NOT_CONFIGURED" };
    }

    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, code: "INVALID_FILE" };
    }

    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (type && !EDITOR_IMAGE_TYPES.has(type)) {
      return { ok: false, code: "INVALID_FILE_TYPE" };
    }

    if (file.size > MAX_EDITOR_IMAGE_BYTES) {
      return { ok: false, code: "FILE_TOO_LARGE" };
    }

    const cloudinary = configureCloudinary();
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: getEditorImageFolder(userId),
          public_id: crypto.randomUUID(),
          resource_type: "image",
          overwrite: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult?.secure_url) {
            reject(error ?? new Error("UPLOAD_FAILED"));
            return;
          }
          resolve({ secure_url: uploadResult.secure_url });
        },
      );
      upload.end(buffer);
    });

    return { ok: true, url: result.secure_url };
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return { ok: false, code: "UNAUTHENTICATED" };
    }
    return { ok: false, code: "UPLOAD_FAILED" };
  }
}
