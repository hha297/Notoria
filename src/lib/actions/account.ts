"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  configureCloudinary,
  extractCloudinaryPublicId,
  getAvatarPublicId,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

const updateNameSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function getAccountUser() {
  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function updatePassword(
  data: z.infer<typeof updatePasswordSchema>,
) {
  const parsed = updatePasswordSchema.parse(data);
  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    throw new Error("PASSWORD_NOT_SET");
  }

  const valid = await compare(parsed.currentPassword, user.passwordHash);

  if (!valid) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  const passwordHash = await hash(parsed.newPassword, 12);

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/account");
}

export async function updateName(data: z.infer<typeof updateNameSchema>) {
  const parsed = updateNameSchema.parse(data);
  const userId = await getCurrentUserId();

  await db
    .update(users)
    .set({
      name: parsed.name,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/account");
  revalidatePath("/", "layout");

  return { name: parsed.name };
}

async function deleteCloudinaryAsset(url: string | null | undefined) {
  if (!url || !isCloudinaryConfigured()) {
    return;
  }

  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) {
    return;
  }

  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}

export async function uploadAvatar(formData: FormData) {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const userId = await getCurrentUserId();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("INVALID_FILE");
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("INVALID_FILE_TYPE");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { image: true },
  });

  const cloudinary = configureCloudinary();
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `notoria/avatars/${userId}`,
        public_id: "avatar",
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "auto" },
        ],
      },
      (error, uploadResult) => {
        if (error || !uploadResult?.secure_url) {
          reject(error ?? new Error("UPLOAD_FAILED"));
          return;
        }

        resolve({ secure_url: uploadResult.secure_url });
      },
    );

    upload.end(buffer);
  });

  await db
    .update(users)
    .set({
      image: result.secure_url,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  if (currentUser?.image && currentUser.image !== result.secure_url) {
    await deleteCloudinaryAsset(currentUser.image);
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");

  return { image: result.secure_url };
}

export async function removeAvatar() {
  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { image: true },
  });

  if (!user?.image) {
    return { image: null };
  }

  if (isCloudinaryConfigured()) {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(getAvatarPublicId(userId), {
      invalidate: true,
    });
  }

  await db
    .update(users)
    .set({
      image: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/account");
  revalidatePath("/", "layout");

  return { image: null };
}
