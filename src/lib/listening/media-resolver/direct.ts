import "server-only";

import { ListeningError } from "@/lib/listening/errors";
import type { ExtractedListeningMedia } from "@/lib/listening/media-resolver/extract";
import { assertSafeListeningMediaUrl } from "@/lib/listening/media-resolver/url";
import { MAX_LISTENING_FILE_SIZE } from "@/lib/listening/utils";

const FETCH_TIMEOUT_MS = 45_000;

const AUDIO_VIDEO_TYPES = [
  "audio/",
  "video/mp4",
  "video/webm",
  "application/ogg",
  "application/octet-stream",
];

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const match = pathname.match(/\.(mp3|m4a|mp4|webm|ogg|opus|wav|aac)(?:$|\?)/);
    return match?.[1] ?? "";
  } catch {
    return "";
  }
}

function formatFromContentType(contentType: string, url: string) {
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("m4a") || contentType.includes("mp4a")) return "m4a";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("wav")) return "wav";
  return extensionFromUrl(url) || "mp3";
}

export async function extractListeningMediaDirect(
  url: string,
): Promise<ExtractedListeningMedia> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "audio/*,video/mp4,application/octet-stream;q=0.8,*/*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new ListeningError("MEDIA_UNAVAILABLE");
    }

    await assertSafeListeningMediaUrl(response.url);

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json") ||
      contentType.includes("text/xml")
    ) {
      throw new ListeningError("UNSUPPORTED_MEDIA_URL");
    }

    if (
      contentType &&
      !AUDIO_VIDEO_TYPES.some((prefix) => contentType.includes(prefix)) &&
      !extensionFromUrl(response.url)
    ) {
      throw new ListeningError("UNSUPPORTED_MEDIA_URL");
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_LISTENING_FILE_SIZE) {
      throw new ListeningError("FILE_TOO_LARGE");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      throw new ListeningError("MEDIA_EXTRACTION_FAILED");
    }
    if (buffer.length > MAX_LISTENING_FILE_SIZE) {
      throw new ListeningError("FILE_TOO_LARGE");
    }

    const format = formatFromContentType(contentType, response.url);
    return {
      buffer,
      filename: `listening.${format}`,
      mimeType: contentType.split(";")[0]?.trim() || "audio/mpeg",
      title: "Listening",
      duration: null,
      format,
      mediaType: format === "mp4" ? "video" : "audio",
    };
  } catch (error) {
    if (error instanceof ListeningError) {
      throw error;
    }
    throw new ListeningError("UNSUPPORTED_MEDIA_URL");
  } finally {
    clearTimeout(timeout);
  }
}
