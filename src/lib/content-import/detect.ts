import type { ContentImportFormat } from "@/lib/content-import/types";

const CSV_MIME = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

export function mimeFromContentFilename(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
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

export function resolveContentMime(file: {
  name: string;
  type?: string | null;
}): string {
  return file.type || mimeFromContentFilename(file.name) || "application/octet-stream";
}

export function detectContentFormat(file: {
  name: string;
  type?: string | null;
}): ContentImportFormat | null {
  const mime = resolveContentMime(file).toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "csv" || CSV_MIME.has(mime)) {
    if (ext === "txt" && mime === "text/plain") return "txt";
    if (ext === "csv" || mime.includes("csv") || mime.includes("excel")) {
      return "csv";
    }
  }
  if (ext === "csv") return "csv";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (
    ext === "docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (ext === "txt" || mime === "text/plain") return "txt";
  // Legacy .doc is rejected later with a friendly error
  if (ext === "doc") return null;
  return null;
}

export function isAllowedContentImportFile(file: {
  name: string;
  type?: string | null;
  size: number;
}): boolean {
  return detectContentFormat(file) !== null;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || filename;
}
