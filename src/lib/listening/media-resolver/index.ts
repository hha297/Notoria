import "server-only";

import { extractListeningMedia } from "@/lib/listening/media-resolver/extract";
import { assertSafeListeningMediaUrl } from "@/lib/listening/media-resolver/url";

export type ResolvedListeningMedia = Awaited<
  ReturnType<typeof extractListeningMedia>
>;

export async function resolveListeningMediaFromUrl(rawUrl: string) {
  const url = await assertSafeListeningMediaUrl(rawUrl);
  return extractListeningMedia(url);
}
