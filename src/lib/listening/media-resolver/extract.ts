import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ListeningError } from "@/lib/listening/errors";
import { MAX_LISTENING_FILE_SIZE } from "@/lib/listening/utils";
import {
  extractionErrorFromOutput,
  getFfmpegPath,
  getYtDlpPath,
  runProcess,
} from "@/lib/listening/media-resolver/process";

export const MAX_LISTENING_MEDIA_DURATION_SECONDS = 30 * 60;
const METADATA_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_FILESIZE_FLAG = "25M";

const MEDIA_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "mp4",
  "webm",
  "ogg",
  "opus",
  "wav",
  "aac",
]);

const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  aac: "audio/aac",
};

export type ExtractedListeningMedia = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  title: string;
  duration: number | null;
  format: string;
  mediaType: "audio" | "video";
};

type YtDlpMetadata = {
  _type?: string;
  title?: string;
  duration?: number | null;
  is_live?: boolean;
  live_status?: string;
  ext?: string;
  extractor?: string;
};

function commonArgs() {
  return [
    "--ignore-config",
    "--no-playlist",
    "--no-warnings",
    "--no-cache-dir",
    "--no-mtime",
    "--socket-timeout",
    "20",
    "--retries",
    "2",
    "--extractor-args",
    "youtube:player_client=tv,android,web",
  ];
}

function parseMetadata(stdout: string): YtDlpMetadata {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new ListeningError("MEDIA_EXTRACTION_FAILED");
  }

  try {
    return JSON.parse(stdout.slice(start, end + 1)) as YtDlpMetadata;
  } catch {
    throw new ListeningError("MEDIA_EXTRACTION_FAILED");
  }
}

function assertExtractable(metadata: YtDlpMetadata) {
  if (metadata._type === "playlist") {
    throw new ListeningError("UNSUPPORTED_MEDIA_URL");
  }

  if (metadata.is_live || metadata.live_status === "is_live") {
    throw new ListeningError("MEDIA_UNAVAILABLE");
  }

  if (
    typeof metadata.duration === "number" &&
    metadata.duration > MAX_LISTENING_MEDIA_DURATION_SECONDS
  ) {
    throw new ListeningError("MEDIA_TOO_LONG");
  }
}

function mediaTypeFromExtension(extension: string) {
  return extension === "mp4" ? "video" : "audio";
}

async function findExtractedFile(directory: string) {
  const names = await readdir(directory);
  const match = names.find((name) => {
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    return MEDIA_EXTENSIONS.has(extension) && !name.endsWith(".part");
  });

  if (!match) {
    throw new ListeningError("MEDIA_EXTRACTION_FAILED");
  }

  return join(directory, match);
}

export async function extractListeningMedia(url: string): Promise<ExtractedListeningMedia> {
  const ytDlp = getYtDlpPath();
  const ffmpegPath = getFfmpegPath();
  const workDir = await mkdtemp(join(tmpdir(), "notoria-listening-"));

  try {
    const metadataResult = await runProcess(
      ytDlp,
      [...commonArgs(), "--skip-download", "-J", "--", url],
      { timeoutMs: METADATA_TIMEOUT_MS, maxStdoutBytes: MAX_JSON_BYTES },
    );

    if (metadataResult.code !== 0) {
      throw extractionErrorFromOutput(metadataResult.stderr || metadataResult.stdout);
    }

    const metadata = parseMetadata(metadataResult.stdout);
    assertExtractable(metadata);

    const outputTemplate = join(workDir, "media.%(ext)s");
    const downloadArgs = [
      ...commonArgs(),
      "--max-filesize",
      MAX_FILESIZE_FLAG,
      "-f",
      "bestaudio/best",
      "-o",
      outputTemplate,
      "--restrict-filenames",
    ];

    if (ffmpegPath) {
      downloadArgs.push(
        "--ffmpeg-location",
        ffmpegPath,
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "5",
      );
    }

    downloadArgs.push("--", url);

    const downloadResult = await runProcess(ytDlp, downloadArgs, {
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      cwd: workDir,
    });

    let filePath: string;
    try {
      filePath = await findExtractedFile(workDir);
    } catch (error) {
      if (downloadResult.code !== 0) {
        throw extractionErrorFromOutput(
          downloadResult.stderr || downloadResult.stdout,
        );
      }
      throw error;
    }
    const buffer = await readFile(filePath);
    if (buffer.length === 0) {
      throw new ListeningError("MEDIA_EXTRACTION_FAILED");
    }
    if (buffer.length > MAX_LISTENING_FILE_SIZE) {
      throw new ListeningError("FILE_TOO_LARGE");
    }

    const format = (filePath.split(".").pop() ?? "mp3").toLowerCase();
    const title = metadata.title?.trim() || "Listening";

    return {
      buffer,
      filename: `listening.${format}`,
      mimeType: MIME_TYPES[format] ?? "application/octet-stream",
      title: title.slice(0, 160),
      duration:
        typeof metadata.duration === "number" ? Math.round(metadata.duration) : null,
      format,
      mediaType: mediaTypeFromExtension(format),
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
