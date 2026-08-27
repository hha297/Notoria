import type { ExerciseImportSource } from "@/db/schema";

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (Cloudinary free-plan limit)

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PLAIN_TEXT_MIME = new Set(["text/plain", "text/markdown"]);

/** Accepted document uploads — PDF and DOCX are parsed server-side. */
const DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export function mimeFromFilename(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    default:
      return null;
  }
}

export function resolveImportMime(file: File): string {
  return file.type || mimeFromFilename(file.name) || "application/octet-stream";
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.has(mime.toLowerCase());
}

export function isPlainTextMime(mime: string): boolean {
  return PLAIN_TEXT_MIME.has(mime.toLowerCase());
}

export function isDocumentMime(mime: string): boolean {
  return DOCUMENT_MIME.has(mime.toLowerCase());
}

export function isAllowedImportFile(file: File): boolean {
  const mime = resolveImportMime(file).toLowerCase();
  return isImageMime(mime) || isPlainTextMime(mime) || isDocumentMime(mime);
}

export function sourceTypeFromMime(mime: string): ExerciseImportSource {
  return isImageMime(mime) ? "image" : "file";
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || filename;
}

export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    const last = path.split("/").filter(Boolean).pop();
    if (last) {
      return decodeURIComponent(last).replace(/[-_]+/g, " ").slice(0, 120);
    }
    return parsed.hostname;
  } catch {
    return "Imported URL";
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
