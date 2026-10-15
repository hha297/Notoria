import { StreamClient } from "@stream-io/node-sdk";
import { SpeakingError } from "@/lib/speaking/errors";

/**
 * Tolerate local/server clock being ahead of Stream
 * (AuthErrorTokenUsedBeforeIssuedAt / connect_agent JWT iat).
 * SDK default is only 1s — not enough when Windows Time sync is off.
 */
const TOKEN_IAT_SKEW_SECONDS = 120;

export function isStreamVideoConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY?.trim() &&
      process.env.STREAM_VIDEO_SECRET_KEY?.trim(),
  );
}

function withSkewTolerantTokens(client: StreamClient) {
  const original = client.generateUserToken.bind(client);
  client.generateUserToken = (payload) => {
    const now = Math.floor(Date.now() / 1000);
    const next = { ...payload };

    if (next.iat == null) {
      next.iat = now - TOKEN_IAT_SKEW_SECONDS;
    }

    if (next.exp == null) {
      const validity = next.validity_in_seconds ?? 3600;
      // Measure expiry from wall-clock now, not the backdated iat.
      next.exp = now + Math.max(1, validity);
    }

    return original(next);
  };
  return client;
}

export function getStreamVideo() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY?.trim();
  const secret = process.env.STREAM_VIDEO_SECRET_KEY?.trim();

  if (!apiKey || !secret) {
    throw new SpeakingError("STREAM_NOT_CONFIGURED");
  }

  return withSkewTolerantTokens(new StreamClient(apiKey, secret));
}

/**
 * Issue a user JWT with skew-tolerant iat. Validity is measured from now.
 */
export function generateStreamUserToken(options: {
  userId: string;
  validityInSeconds: number;
}) {
  return getStreamVideo().generateUserToken({
    user_id: options.userId,
    validity_in_seconds: Math.max(1, options.validityInSeconds),
  });
}
