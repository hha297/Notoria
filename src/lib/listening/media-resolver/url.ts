import { lookup } from "node:dns/promises";
import { ListeningError } from "@/lib/listening/errors";

const MAX_URL_LENGTH = 2048;
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan"];
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
]);

function stripBrackets(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase();
}

function isBlockedIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedAddress(address: string) {
  const ip = stripBrackets(address);

  if (ip === "::1" || ip === "::" || ip === "0.0.0.0") return true;
  if (isBlockedIpv4(ip)) return true;

  if (ip.includes(":")) {
    if (ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
      return true;
    }
    if (ip.startsWith("::ffff:")) {
      return isBlockedAddress(ip.slice("::ffff:".length));
    }
  }

  return false;
}

function isBlockedHostname(hostname: string) {
  const host = stripBrackets(hostname);
  if (!host || BLOCKED_HOSTS.has(host)) return true;
  if (isBlockedAddress(host)) return true;
  return BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export async function assertSafeListeningMediaUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    throw new ListeningError("INVALID_URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ListeningError("INVALID_URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new ListeningError("INVALID_URL");
  }

  if (parsed.username || parsed.password) {
    throw new ListeningError("INVALID_URL");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new ListeningError("INVALID_URL");
  }

  try {
    const records = await lookup(parsed.hostname, { all: true });
    if (records.length === 0 || records.some((record) => isBlockedAddress(record.address))) {
      throw new ListeningError("INVALID_URL");
    }
  } catch (error) {
    if (error instanceof ListeningError) {
      throw error;
    }
    throw new ListeningError("INVALID_URL");
  }

  return parsed.href;
}

export function isCloudBlockedMediaHost(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com") ||
      host === "soundcloud.com" ||
      host.endsWith(".soundcloud.com")
    );
  } catch {
    return false;
  }
}
