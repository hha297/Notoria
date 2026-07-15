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

export function getAvatarFolder(userId: string) {
  return `notoria/avatars/${userId}`;
}

export function getAvatarPublicId(userId: string) {
  return `${getAvatarFolder(userId)}/avatar`;
}

export function extractCloudinaryPublicId(url: string): string | null {
  if (!url.includes("res.cloudinary.com")) {
    return null;
  }

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^/]+$/);
  return match?.[1] ?? null;
}
