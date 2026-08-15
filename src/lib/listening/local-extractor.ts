const LOCAL_EXTRACTOR_URL = "http://127.0.0.1:8787";

export type LocalExtractedMedia = {
  file: File;
  title: string;
};

function decodeHeader(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function isLocalListeningExtractorReady() {
  try {
    const response = await fetch(`${LOCAL_EXTRACTOR_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function extractListeningMediaLocally(
  url: string,
): Promise<LocalExtractedMedia | null> {
  try {
    const response = await fetch(`${LOCAL_EXTRACTOR_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.size) return null;

    const format =
      (response.headers.get("x-listening-format") ?? "mp3")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "mp3";

    return {
      file: new File([blob], `listening.${format}`, {
        type: blob.type || "audio/mpeg",
      }),
      title: decodeHeader(response.headers.get("x-listening-title"), "").slice(
        0,
        160,
      ),
    };
  } catch {
    return null;
  }
}
