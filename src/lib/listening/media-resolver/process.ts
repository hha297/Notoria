import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { ListeningError } from "@/lib/listening/errors";

const require = createRequire(import.meta.url);

const ALLOWED_CHILD_ENV_KEYS = [
  "PATH",
  "Path",
  "PATHEXT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "SYSTEMROOT",
  "SystemRoot",
  "WINDIR",
  "HOME",
  "USERPROFILE",
  "LANG",
  "LC_ALL",
] as const;

function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: process.env.NODE_ENV ?? "production",
  };
  for (const key of ALLOWED_CHILD_ENV_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

function bundledYtDlpPath() {
  const filename = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const candidates: string[] = [
    join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", filename),
  ];

  try {
    candidates.unshift(
      join(dirname(require.resolve("youtube-dl-exec/package.json")), "bin", filename),
    );
  } catch {
    // Fall back to the project-local binary path.
  }

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function getYtDlpPath() {
  const fromEnv = process.env.YT_DLP_PATH?.trim();
  if (fromEnv) return fromEnv;

  const bundled = bundledYtDlpPath();
  if (bundled && existsSync(bundled)) return bundled;

  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

export function getFfmpegPath() {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  try {
    const bundled = require("ffmpeg-static") as string | null;
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    // Optional: FFmpeg is used when present for conversion/merging.
  }

  return null;
}

export type ProcessResult = {
  stdout: string;
  stderr: string;
  code: number | null;
};

export function runProcess(
  command: string,
  args: string[],
  options: { timeoutMs: number; cwd?: string; maxStdoutBytes?: number },
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: childEnv(),
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      reject(mapSpawnError(error));
      return;
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let settled = false;

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (options.maxStdoutBytes && stdoutBytes > options.maxStdoutBytes) {
        child.kill("SIGKILL");
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (Buffer.concat(stderrChunks).length < 64_000) {
        stderrChunks.push(chunk);
      }
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(mapSpawnError(error));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        code,
      });
    });
  });
}

function mapSpawnError(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "ENOENT") {
    return new ListeningError("EXTRACTOR_NOT_CONFIGURED");
  }
  return new ListeningError("MEDIA_EXTRACTION_FAILED");
}

export function extractionErrorFromOutput(stderr: string) {
  const text = stderr.toLowerCase();

  if (
    /unsupported url|no video formats|requested format is not available|unable to extract|no media found/.test(
      text,
    )
  ) {
    return new ListeningError("UNSUPPORTED_MEDIA_URL");
  }

  if (
    /private video|login required|sign in to confirm|members-only|join this channel|age[ -]?restrict|http error 401|http error 404|video unavailable|this video is not available|drm protected/.test(
      text,
    )
  ) {
    return new ListeningError("MEDIA_UNAVAILABLE");
  }

  if (/larger than max-filesize|file is larger/.test(text)) {
    return new ListeningError("FILE_TOO_LARGE");
  }

  return new ListeningError("MEDIA_EXTRACTION_FAILED");
}
