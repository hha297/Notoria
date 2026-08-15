import "server-only";

import { ListeningError } from "@/lib/listening/errors";
import { extractListeningMedia } from "@/lib/listening/media-resolver/extract";
import {
  extractListeningMediaRemote,
  hasRemoteListeningExtractor,
} from "@/lib/listening/media-resolver/remote";
import { assertSafeListeningMediaUrl } from "@/lib/listening/media-resolver/url";

export type ResolvedListeningMedia = Awaited<
  ReturnType<typeof extractListeningMedia>
>;

export function canRunListeningExtractor() {
  if (hasRemoteListeningExtractor()) {
    return true;
  }

  if (process.env.LISTENING_ENABLE_URL_EXTRACTOR === "1") {
    return true;
  }

  return !(
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

export async function resolveListeningMediaFromUrl(rawUrl: string) {
  const url = await assertSafeListeningMediaUrl(rawUrl);

  if (hasRemoteListeningExtractor()) {
    return extractListeningMediaRemote(url);
  }

  if (!canRunListeningExtractor()) {
    throw new ListeningError("EXTRACTOR_NOT_CONFIGURED");
  }

  return extractListeningMedia(url);
}
