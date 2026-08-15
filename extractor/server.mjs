import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lookup } from "node:dns/promises";

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.LISTENING_EXTRACTOR_SECRET?.trim() || "";
const MAX_URL_LENGTH = 2048;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 30 * 60;
const METADATA_TIMEOUT_MS = 45_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

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

const MIME_TYPES = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "audio/webm",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  aac: "audio/aac",
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function isBlockedIpv4(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedAddress(address) {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (ip === "::1" || ip === "::" || ip === "0.0.0.0") return true;
  if (isBlockedIpv4(ip)) return true;
  if (ip.includes(":")) {
    if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
    if (ip.startsWith("::ffff:")) return isBlockedAddress(ip.slice(7));
  }
  return false;
}

async function assertSafeUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    isBlockedAddress(host)
  ) {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }

  const records = await lookup(host, { all: true }).catch(() => []);
  if (records.length === 0 || records.some((record) => isBlockedAddress(record.address))) {
    throw Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" });
  }

  return parsed.href;
}

function runProcess(command, args, options) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          LANG: process.env.LANG || "C.UTF-8",
        },
        shell: false,
      });
    } catch {
      reject(Object.assign(new Error("EXTRACTOR_NOT_CONFIGURED"), { code: "EXTRACTOR_NOT_CONFIGURED" }));
      return;
    }

    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    const timeout = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs);

    child.stdout?.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk) => {
      if (Buffer.concat(stderrChunks).length < 64_000) stderrChunks.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const code = error && error.code === "ENOENT" ? "EXTRACTOR_NOT_CONFIGURED" : "MEDIA_EXTRACTION_FAILED";
      reject(Object.assign(new Error(code), { code }));
    });
    child.on("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        code: exitCode,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

function mapYtDlpError(text) {
  const lower = String(text || "").toLowerCase();
  if (/unsupported url|no video formats|unable to extract|no media found/.test(lower)) {
    return "UNSUPPORTED_MEDIA_URL";
  }
  if (
    /private video|login required|sign in to confirm|members-only|http error 401|http error 404|video unavailable|drm protected/.test(
      lower,
    )
  ) {
    return "MEDIA_UNAVAILABLE";
  }
  if (/larger than max-filesize|file is larger/.test(lower)) return "FILE_TOO_LARGE";
  return "MEDIA_EXTRACTION_FAILED";
}

async function extract(url) {
  const workDir = await mkdtemp(join(tmpdir(), "notoria-listening-"));
  try {
    const meta = await runProcess(
      "yt-dlp",
      [
        "--ignore-config",
        "--no-playlist",
        "--no-warnings",
        "--no-cache-dir",
        "--skip-download",
        "-J",
        "--",
        url,
      ],
      { timeoutMs: METADATA_TIMEOUT_MS },
    );
    if (meta.code !== 0) {
      const code = mapYtDlpError(meta.stderr || meta.stdout);
      throw Object.assign(new Error(code), { code });
    }

    const start = meta.stdout.indexOf("{");
    const end = meta.stdout.lastIndexOf("}");
    const metadata = JSON.parse(meta.stdout.slice(start, end + 1));
    if (metadata._type === "playlist") {
      throw Object.assign(new Error("UNSUPPORTED_MEDIA_URL"), { code: "UNSUPPORTED_MEDIA_URL" });
    }
    if (metadata.is_live || metadata.live_status === "is_live") {
      throw Object.assign(new Error("MEDIA_UNAVAILABLE"), { code: "MEDIA_UNAVAILABLE" });
    }
    if (typeof metadata.duration === "number" && metadata.duration > MAX_DURATION_SECONDS) {
      throw Object.assign(new Error("MEDIA_TOO_LONG"), { code: "MEDIA_TOO_LONG" });
    }

    const output = join(workDir, "media.%(ext)s");
    const download = await runProcess(
      "yt-dlp",
      [
        "--ignore-config",
        "--no-playlist",
        "--no-warnings",
        "--no-cache-dir",
        "--max-filesize",
        "25M",
        "-f",
        "bestaudio/best",
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "5",
        "-o",
        output,
        "--restrict-filenames",
        "--",
        url,
      ],
      { timeoutMs: DOWNLOAD_TIMEOUT_MS, cwd: workDir },
    );

    const names = await readdir(workDir);
    const fileName = names.find((name) => {
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      return MEDIA_EXTENSIONS.has(ext) && !name.endsWith(".part");
    });
    if (!fileName) {
      const code = download.code !== 0 ? mapYtDlpError(download.stderr || download.stdout) : "MEDIA_EXTRACTION_FAILED";
      throw Object.assign(new Error(code), { code });
    }

    const filePath = join(workDir, fileName);
    const buffer = await readFile(filePath);
    if (!buffer.length) {
      throw Object.assign(new Error("MEDIA_EXTRACTION_FAILED"), { code: "MEDIA_EXTRACTION_FAILED" });
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" });
    }

    const format = (fileName.split(".").pop() || "mp3").toLowerCase();
    return {
      buffer,
      title: String(metadata.title || "Listening").slice(0, 160),
      duration: typeof metadata.duration === "number" ? Math.round(metadata.duration) : "",
      format,
      mediaType: format === "mp4" ? "video" : "audio",
      mimeType: MIME_TYPES[format] || "application/octet-stream",
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 32_000) {
        reject(Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("INVALID_URL"), { code: "INVALID_URL" }));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/extract") {
    json(res, 404, { code: "LESSON_NOT_FOUND" });
    return;
  }

  const auth = req.headers.authorization || "";
  if (!SECRET || auth !== `Bearer ${SECRET}`) {
    json(res, 401, { code: "EXTRACTOR_NOT_CONFIGURED" });
    return;
  }

  try {
    const body = await readJson(req);
    const url = await assertSafeUrl(body.url);
    const media = await extract(url);
    res.writeHead(200, {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.buffer.length),
      "X-Listening-Title": encodeURIComponent(media.title),
      "X-Listening-Duration": String(media.duration),
      "X-Listening-Format": media.format,
      "X-Listening-Media-Type": media.mediaType,
    });
    res.end(media.buffer);
  } catch (error) {
    json(res, 400, { code: error?.code || "MEDIA_EXTRACTION_FAILED" });
  }
});

if (!SECRET) {
  console.error("LISTENING_EXTRACTOR_SECRET is required");
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`listening extractor on :${PORT}`);
});
