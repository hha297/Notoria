import {
  ListeningError,
  isListeningErrorCode,
  type ListeningErrorCode,
} from "@/lib/listening/errors";
import type { ExtractedListeningMedia } from "@/lib/listening/media-resolver/extract";
import { isCloudBlockedMediaHost } from "@/lib/listening/media-resolver/url";

const EXTRACTOR_TIMEOUT_MS = 180_000;
const MAX_EXTRACTED_BYTES = 25 * 1024 * 1024;

function extractorBaseUrl() {
  return (
    process.env.LISTENING_EXTRACTOR_URL?.trim()
      .replace(/\/+$/, "")
      .replace(/\/extract$/i, "") ?? ""
  );
}

function extractorSecret() {
  return process.env.LISTENING_EXTRACTOR_SECRET?.trim() ?? "";
}

function decodeHeaderValue(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchExtractor(
  baseUrl: string,
  secret: string,
  url: string,
  signal: AbortSignal,
) {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${baseUrl}/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal,
    });
    lastResponse = response;

    const contentType = response.headers.get("content-type") ?? "";
    const shouldRetry =
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504 ||
      contentType.includes("text/html");

    if (!shouldRetry || attempt === 1) {
      return response;
    }

    await sleep(3_000);
  }

  return lastResponse!;
}

export function hasRemoteListeningExtractor() {
  return Boolean(extractorBaseUrl() && extractorSecret());
}

export async function extractListeningMediaRemote(
  url: string,
): Promise<ExtractedListeningMedia> {
  const baseUrl = extractorBaseUrl();
  const secret = extractorSecret();
  if (!baseUrl || !secret) {
    throw new ListeningError("EXTRACTOR_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTRACTOR_TIMEOUT_MS);

  try {
    const response = await fetchExtractor(baseUrl, secret, url, controller.signal);

    if (!response.ok) {
      let code: ListeningErrorCode = "MEDIA_EXTRACTION_FAILED";
      try {
        const payload = (await response.json()) as { code?: string };
        if (payload.code && isListeningErrorCode(payload.code)) {
          code = payload.code;
        }
      } catch {
        // Keep the generic extraction error.
      }
      throw new ListeningError(
        code === "MEDIA_EXTRACTION_FAILED" && isCloudBlockedMediaHost(url)
          ? "MEDIA_SOURCE_BLOCKED"
          : code,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new ListeningError("MEDIA_EXTRACTION_FAILED");
    }
    if (buffer.length > MAX_EXTRACTED_BYTES) {
      throw new ListeningError("FILE_TOO_LARGE");
    }

    const format = (response.headers.get("x-listening-format") ?? "mp3")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "mp3";
    const durationHeader = response.headers.get("x-listening-duration");
    const duration = durationHeader ? Number(durationHeader) : NaN;
    const mediaType =
      response.headers.get("x-listening-media-type") === "video" ? "video" : "audio";
    const title = decodeHeaderValue(
      response.headers.get("x-listening-title"),
      "Listening",
    ).slice(0, 160);

    return {
      buffer,
      filename: `listening.${format}`,
      mimeType: response.headers.get("content-type") || "audio/mpeg",
      title,
      duration: Number.isFinite(duration) ? Math.round(duration) : null,
      format,
      mediaType,
    };
  } catch (error) {
    if (error instanceof ListeningError) {
      throw error;
    }
    throw new ListeningError(
      isCloudBlockedMediaHost(url) ? "MEDIA_SOURCE_BLOCKED" : "MEDIA_EXTRACTION_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}
