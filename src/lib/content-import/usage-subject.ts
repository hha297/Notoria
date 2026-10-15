import { createHash } from "crypto";
import type { ContentImportTarget } from "@/lib/content-import/types";

/** Stable subject so analyze + confirm share one `content_import` reservation. */
export function contentImportUsageSubject(
  target: ContentImportTarget,
  buffer: Buffer,
): string {
  const digest = createHash("sha256")
    .update(target)
    .update(buffer)
    .digest("hex")
    .slice(0, 40);
  return `content-import:${digest}`;
}
