import { StreamClient } from "@stream-io/node-sdk";
import { SpeakingError } from "@/lib/speaking/errors";

export function isStreamVideoConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY?.trim() &&
      process.env.STREAM_VIDEO_SECRET_KEY?.trim(),
  );
}

export function getStreamVideo() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY?.trim();
  const secret = process.env.STREAM_VIDEO_SECRET_KEY?.trim();

  if (!apiKey || !secret) {
    throw new SpeakingError("STREAM_NOT_CONFIGURED");
  }

  return new StreamClient(apiKey, secret);
}
