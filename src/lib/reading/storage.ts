/** Shared Reading document storage limits and pathname helpers (Vercel Blob). */

export const MAX_READING_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const READING_STORAGE_PROVIDER = "vercel-blob" as const;

export const READING_PDF_MIME = "application/pdf";
export const READING_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const READING_ALLOWED_MIME_TYPES = [
  READING_PDF_MIME,
  READING_DOCX_MIME,
] as const;

export type ReadingAllowedMimeType =
  (typeof READING_ALLOWED_MIME_TYPES)[number];

/** Enable Blob multipart for larger files (SDK-compatible; recommended near/above ~100 MB). */
export const READING_MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

export function mimeFromReadingFilename(filename: string): ReadingAllowedMimeType | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return READING_PDF_MIME;
  if (lower.endsWith(".docx")) return READING_DOCX_MIME;
  return null;
}

export function resolveReadingMimeType(
  filename: string,
  mimeType?: string | null,
): ReadingAllowedMimeType | null {
  const fromName = mimeFromReadingFilename(filename);
  const normalized = (mimeType ?? "").toLowerCase().trim();
  if (
    normalized === READING_PDF_MIME ||
    normalized === READING_DOCX_MIME
  ) {
    return normalized;
  }
  return fromName;
}

export function readingSourceTypeFromMime(
  mime: ReadingAllowedMimeType,
): "pdf" | "docx" {
  return mime === READING_PDF_MIME ? "pdf" : "docx";
}

/** Strip path segments and unsafe characters from a user-supplied filename. */
export function sanitizeReadingFilename(filename: string): string {
  const base = filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .trim();

  const safe = (base || "document").slice(0, 180);
  const lower = safe.toLowerCase();
  if (lower.endsWith(".pdf") || lower.endsWith(".docx")) return safe;
  return `${safe}.bin`;
}

export function buildReadingBlobPathname(input: {
  userId: string;
  documentId: string;
  filename: string;
}): string {
  const safeName = sanitizeReadingFilename(input.filename);
  return `users/${input.userId}/reading/${input.documentId}/${safeName}`;
}

/** Reject path traversal / cross-user pathnames. */
export function isOwnedReadingBlobPathname(
  pathname: string,
  userId: string,
  documentId: string,
): boolean {
  if (!pathname || pathname.includes("..") || pathname.includes("\\")) {
    return false;
  }
  const expectedPrefix = `users/${userId}/reading/${documentId}/`;
  if (!pathname.startsWith(expectedPrefix)) return false;
  const rest = pathname.slice(expectedPrefix.length);
  if (!rest || rest.includes("/")) return false;
  return true;
}

export function validateReadingUploadFile(input: {
  filename: string;
  mimeType?: string | null;
  sizeBytes: number;
}):
  | { ok: true; mimeType: ReadingAllowedMimeType; safeFilename: string }
  | {
      ok: false;
      code:
        | "INVALID_FILE"
        | "EMPTY_FILE"
        | "INVALID_FILE_TYPE"
        | "FILE_TOO_LARGE";
    } {
  const name = input.filename?.trim() ?? "";
  if (!name) return { ok: false, code: "INVALID_FILE" };
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return { ok: false, code: "EMPTY_FILE" };
  }
  if (input.sizeBytes > MAX_READING_FILE_SIZE_BYTES) {
    return { ok: false, code: "FILE_TOO_LARGE" };
  }
  const mime = resolveReadingMimeType(name, input.mimeType);
  if (!mime) return { ok: false, code: "INVALID_FILE_TYPE" };
  return {
    ok: true,
    mimeType: mime,
    safeFilename: sanitizeReadingFilename(name),
  };
}
