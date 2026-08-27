import { v2 as cloudinary } from "cloudinary";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export function getCloudinaryPublicConfig() {
  const config = getCloudinaryConfig();
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
  };
}

export function configureCloudinary() {
  const config = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return cloudinary;
}

/** Sign params for a direct client → Cloudinary upload (progress-capable). */
export function signCloudinaryUploadParams(
  params: Record<string, string | number | boolean>,
) {
  const { apiSecret } = getCloudinaryConfig();
  const cloudinary = configureCloudinary();
  return cloudinary.utils.api_sign_request(params, apiSecret);
}

export function getAvatarFolder(userId: string) {
  return `notoria/avatars/${userId}`;
}

export function getAvatarPublicId(userId: string) {
  return `${getAvatarFolder(userId)}/avatar`;
}

export function getListeningFolder(userId: string, workspaceId: string) {
  return `notoria/listening/${userId}/${workspaceId}`;
}

export function getExerciseImportFolder(userId: string, workspaceId: string) {
  return `notoria/exercise-imports/${userId}/${workspaceId}`;
}

export function getEditorImageFolder(userId: string) {
  return `notoria/editor/${userId}`;
}

export function extractCloudinaryPublicId(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) {
    return null;
  }

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^/]+$/);
  return match?.[1] ?? null;
}

export function cloudinaryResourceTypeForMime(
  mimeType: string | null | undefined,
): "image" | "raw" {
  return mimeType?.startsWith("image/") ? "image" : "raw";
}

/**
 * Download an uploaded asset via Cloudinary's authenticated temporary URL.
 * Prefer this over the public CDN URL — free plans often block public PDF/ZIP delivery
 * even though upload succeeds (Settings → Security → Allow delivery of PDF and ZIP files).
 */
export async function downloadCloudinaryAsset(input: {
  publicId: string;
  resourceType: "image" | "raw";
  fallbackUrl?: string | null;
}): Promise<Buffer> {
  const cloudinary = configureCloudinary();
  const downloadUrl = cloudinary.utils.private_download_url(
    input.publicId,
    // Raw public_ids already include the extension; omit format.
    null as unknown as string,
    {
      resource_type: input.resourceType,
      type: "upload",
      expires_at: Math.round(Date.now() / 1000) + 300,
    },
  );

  let response = await fetch(downloadUrl);
  if (!response.ok && input.fallbackUrl) {
    response = await fetch(input.fallbackUrl);
  }
  if (!response.ok) {
    throw new Error(`CLOUDINARY_DOWNLOAD_FAILED:${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
