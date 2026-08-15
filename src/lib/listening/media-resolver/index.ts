import "server-only";

import { ListeningError } from "@/lib/listening/errors";
import { extractListeningMediaDirect } from "@/lib/listening/media-resolver/direct";
import { extractListeningMedia } from "@/lib/listening/media-resolver/extract";
import {
  extractListeningMediaRemote,
  hasRemoteListeningExtractor,
} from "@/lib/listening/media-resolver/remote";
import { assertSafeListeningMediaUrl } from "@/lib/listening/media-resolver/url";
import { isHostedMediaPageUrl } from "@/lib/listening/utils";

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

async function extractWithYtDlp(url: string) {
  if (hasRemoteListeningExtractor()) {
    try {
      return await extractListeningMediaRemote(url);
    } catch (error) {
      if (
        error instanceof ListeningError &&
        (error.code === "MEDIA_SOURCE_BLOCKED" ||
          error.code === "MEDIA_EXTRACTION_FAILED") &&
        isHostedMediaPageUrl(url)
      ) {
        throw new ListeningError("LOCAL_EXTRACTOR_REQUIRED");
      }
      throw error;
    }
  }

  if (!canRunListeningExtractor()) {
    throw new ListeningError(
      isHostedMediaPageUrl(url)
        ? "LOCAL_EXTRACTOR_REQUIRED"
        : "EXTRACTOR_NOT_CONFIGURED",
    );
  }

  return extractListeningMedia(url);
}

export async function resolveListeningMediaFromUrl(rawUrl: string) {
  const url = await assertSafeListeningMediaUrl(rawUrl);

  if (isHostedMediaPageUrl(url)) {
    return extractWithYtDlp(url);
  }

  try {
    return await extractListeningMediaDirect(url);
  } catch (error) {
    if (
      !(error instanceof ListeningError) ||
      error.code !== "UNSUPPORTED_MEDIA_URL"
    ) {
      throw error;
    }
  }

  return extractWithYtDlp(url);
}
