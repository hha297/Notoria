import { randomUUID } from "crypto";

/** Sanitize a backup filename for a Blob pathname segment. */
export function sanitizeBackupFilename(filename: string): string {
  const base = filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .trim();

  const safe = (base || "notoria-backup.json").slice(0, 180);
  return safe.toLowerCase().endsWith(".json") ? safe : `${safe}.json`;
}

export function buildAccountBackupBlobPathname(input: {
  userId: string;
  uploadId: string;
  filename: string;
}): string {
  return `users/${input.userId}/account-backups/${input.uploadId}/${sanitizeBackupFilename(input.filename)}`;
}

export function isOwnedAccountBackupBlobPathname(
  pathname: string,
  userId: string,
  uploadId?: string,
): boolean {
  if (!pathname || pathname.includes("..") || pathname.includes("\\")) {
    return false;
  }
  const prefix = `users/${userId}/account-backups/`;
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  const parts = rest.split("/");
  if (parts.length !== 2) return false;
  const [id, file] = parts;
  if (!id || !file || file.includes("/")) return false;
  if (uploadId && id !== uploadId) return false;
  return true;
}

export function newAccountBackupUploadId() {
  return randomUUID();
}
