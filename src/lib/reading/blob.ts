import { del, get } from "@vercel/blob";

/** Fetch a private Reading document from Vercel Blob as a Buffer. */
export async function downloadReadingBlob(
  pathname: string,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("BLOB_NOT_FOUND");
  }

  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return {
    buffer,
    contentType: result.blob.contentType ?? null,
  };
}

/** Best-effort delete; ignores missing blobs. */
export async function deleteReadingBlob(
  pathnameOrUrl: string | null | undefined,
): Promise<void> {
  if (!pathnameOrUrl) return;
  try {
    await del(pathnameOrUrl);
  } catch {
    // Orphan cleanup must not fail the primary DB operation.
  }
}
