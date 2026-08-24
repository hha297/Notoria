import type { JSONContent } from "@tiptap/react";

export const MAX_EDITOR_IMAGE_BYTES = 5 * 1024 * 1024;

export const EDITOR_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type EditorImageErrorCode =
  | "UNAUTHENTICATED"
  | "CLOUDINARY_NOT_CONFIGURED"
  | "INVALID_FILE"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "UPLOAD_FAILED";

export function isTransientMediaSrc(src: string | null | undefined): boolean {
  if (!src) return true;
  const value = src.trim().toLowerCase();
  return (
    value.startsWith("blob:") ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  );
}

export function isPersistedImageSrc(src: string | null | undefined): boolean {
  if (!src?.trim()) return false;
  return !isTransientMediaSrc(src);
}

export function guessImageType(fileName: string | undefined): string | null {
  if (!fileName) return null;
  if (/\.png$/i.test(fileName)) return "image/png";
  if (/\.jpe?g$/i.test(fileName)) return "image/jpeg";
  if (/\.webp$/i.test(fileName)) return "image/webp";
  if (/\.gif$/i.test(fileName)) return "image/gif";
  return null;
}

export function withClipboardImageType(file: File): File {
  if (file.type === "image/jpg") {
    return new File([file], file.name || "image.jpg", { type: "image/jpeg" });
  }
  if (EDITOR_IMAGE_TYPES.has(file.type)) return file;

  const guessed = guessImageType(file.name);
  if (guessed) {
    return new File([file], file.name || "pasted-image", { type: guessed });
  }
  if (!file.type) {
    return new File([file], file.name || "pasted-image.png", {
      type: "image/png",
    });
  }
  return file;
}

export async function fileFromTransientSrc(src: string): Promise<File> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("INVALID_FILE");
  }
  const blob = await response.blob();
  const type =
    blob.type && EDITOR_IMAGE_TYPES.has(blob.type) ? blob.type : "image/png";
  return new File([blob], "pasted-image", { type });
}

export function collectImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];

  const files: File[] = [];
  const seen = new Set<string>();

  function add(file: File | null) {
    if (!file || file.size <= 0) return;
    if (file.type && !file.type.startsWith("image/")) return;
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return;
    seen.add(key);
    files.push(file);
  }

  for (const file of Array.from(data.files ?? [])) {
    add(file);
  }

  if (files.length > 0) return files;

  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === "file") {
      add(item.getAsFile());
    }
  }

  return files;
}

export function isAllowedEditorImageFile(file: File) {
  const prepared = withClipboardImageType(file);
  if (!EDITOR_IMAGE_TYPES.has(prepared.type)) {
    return "INVALID_FILE_TYPE" as const;
  }
  if (prepared.size > MAX_EDITOR_IMAGE_BYTES) {
    return "FILE_TOO_LARGE" as const;
  }
  return null;
}

function imageSrc(node: JSONContent): string {
  const src = node.attrs?.src;
  return typeof src === "string" ? src : "";
}

export function editorDocHasTransientImages(doc: JSONContent | null | undefined): boolean {
  if (!doc) return false;

  let found = false;
  walk(doc, (node) => {
    if (node.type === "image" && isTransientMediaSrc(imageSrc(node))) {
      found = true;
    }
  });
  return found;
}

export function stripTransientImages(doc: JSONContent): JSONContent {
  return filterNodes(doc, (node) => {
    if (node.type !== "image") return true;
    return isPersistedImageSrc(imageSrc(node));
  });
}

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

function filterNodes(
  node: JSONContent,
  keep: (node: JSONContent) => boolean,
): JSONContent {
  const next: JSONContent = { ...node };
  if (node.content) {
    next.content = node.content
      .filter(keep)
      .map((child) => filterNodes(child, keep));
  }
  return next;
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(
      /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value) ? value : `https://${value}`,
    );
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(
      /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
