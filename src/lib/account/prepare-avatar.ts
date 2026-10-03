/**
 * Client-side avatar preparation: validate, resize, and compress before upload.
 * Never send the original large file through a Next.js Server Action.
 */

export const AVATAR_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = 900 * 1024;
export const AVATAR_MAX_EDGE = 800;
export const AVATAR_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export class AvatarClientError extends Error {
  constructor(message: "INVALID_FILE_TYPE" | "FILE_TOO_LARGE" | "PROCESS_FAILED") {
    super(message);
    this.name = "AvatarClientError";
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new AvatarClientError("PROCESS_FAILED"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

/**
 * Resize + compress an avatar image in the browser.
 * Output is JPEG (or WebP when smaller) under {@link AVATAR_MAX_OUTPUT_BYTES}.
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  if (!AVATAR_ALLOWED_TYPES.has(file.type)) {
    throw new AvatarClientError("INVALID_FILE_TYPE");
  }
  if (file.size <= 0 || file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new AvatarClientError("FILE_TOO_LARGE");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarClientError("PROCESS_FAILED");
  }

  try {
    const scale = Math.min(
      1,
      AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new AvatarClientError("PROCESS_FAILED");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const candidates: Array<{ type: string; quality: number; ext: string }> = [
      { type: "image/webp", quality: 0.82, ext: "webp" },
      { type: "image/jpeg", quality: 0.85, ext: "jpg" },
      { type: "image/jpeg", quality: 0.72, ext: "jpg" },
      { type: "image/jpeg", quality: 0.6, ext: "jpg" },
    ];

    let best: { blob: Blob; ext: string } | null = null;
    for (const candidate of candidates) {
      try {
        const blob = await canvasToBlob(
          canvas,
          candidate.type,
          candidate.quality,
        );
        if (!best || blob.size < best.blob.size) {
          best = { blob, ext: candidate.ext };
        }
        if (blob.size <= AVATAR_MAX_OUTPUT_BYTES) {
          best = { blob, ext: candidate.ext };
          break;
        }
      } catch {
        // try next candidate
      }
    }

    if (!best) {
      throw new AvatarClientError("PROCESS_FAILED");
    }
    if (best.blob.size > AVATAR_MAX_OUTPUT_BYTES) {
      throw new AvatarClientError("FILE_TOO_LARGE");
    }

    const base =
      file.name.replace(/\.[^.]+$/, "").slice(0, 64).trim() || "avatar";
    return new File([best.blob], `${base}.${best.ext}`, {
      type: best.blob.type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export async function uploadAvatarToCloudinary(
  file: File,
  sign: {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
  },
): Promise<{ secureUrl: string; publicId: string }> {
  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sign.apiKey);
  formData.append("timestamp", String(sign.timestamp));
  formData.append("signature", sign.signature);
  formData.append("folder", sign.folder);
  formData.append("public_id", sign.publicId);
  formData.append("overwrite", "true");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("UPLOAD_FAILED");
  }

  const data = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };

  if (!data.secure_url || !data.public_id) {
    throw new Error("UPLOAD_FAILED");
  }

  return { secureUrl: data.secure_url, publicId: data.public_id };
}

/** Detect oversized Server Action / Vercel body responses. */
export function isRequestTooLargeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("413") ||
    message.includes("content too large") ||
    message.includes("body exceeded") ||
    message.includes("request entity too large") ||
    message.includes("unexpected response was received from the server")
  );
}
