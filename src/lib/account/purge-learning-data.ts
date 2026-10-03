import { del, list } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import {
  aiUsage,
  aiUsageReservations,
  exerciseImports,
  listeningLessons,
  readingPassages,
  users,
  workspaces,
} from "@/db/schema";
import {
  configureCloudinary,
  extractCloudinaryPublicId,
  getAvatarPublicId,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

async function destroyCloudinaryPublicId(
  publicId: string | null | undefined,
  resourceType: "image" | "video" | "raw",
) {
  if (!isCloudinaryConfigured() || !publicId) return;
  try {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch {
    // Best-effort media cleanup.
  }
}

async function destroyUserBlobPrefix(userId: string) {
  if (
    !process.env.BLOB_READ_WRITE_TOKEN?.trim() &&
    !process.env.BLOB_STORE_ID?.trim()
  ) {
    return;
  }

  try {
    let cursor: string | undefined;
    do {
      const page = await list({
        prefix: `users/${userId}/`,
        cursor,
        limit: 1000,
      });
      if (page.blobs.length > 0) {
        await del(page.blobs.map((blob) => blob.url));
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch {
    // Fall back to per-row storagePath deletion below.
  }
}

/**
 * Remove all learning/workspace/media data for a user while keeping the
 * account row, auth credentials, and Stripe subscription identity.
 */
export async function purgeUserLearningData(userId: string) {
  const [listeningAssets, importAssets, readingAssets, user] =
    await Promise.all([
      db.query.listeningLessons.findMany({
        where: eq(listeningLessons.userId, userId),
        columns: { cloudinaryPublicId: true },
      }),
      db.query.exerciseImports.findMany({
        where: eq(exerciseImports.userId, userId),
        columns: { filePublicId: true, mimeType: true },
      }),
      db.query.readingPassages.findMany({
        where: eq(readingPassages.userId, userId),
        columns: { storagePath: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { image: true },
      }),
    ]);

  await Promise.all([
    ...listeningAssets.map((lesson) =>
      destroyCloudinaryPublicId(lesson.cloudinaryPublicId, "video"),
    ),
    ...importAssets.map((row) =>
      destroyCloudinaryPublicId(
        row.filePublicId,
        row.mimeType?.startsWith("image/") ? "image" : "raw",
      ),
    ),
    destroyCloudinaryPublicId(getAvatarPublicId(userId), "image"),
    destroyCloudinaryPublicId(
      user?.image ? extractCloudinaryPublicId(user.image) : null,
      "image",
    ),
    destroyUserBlobPrefix(userId),
  ]);

  // Per-path delete if prefix list was unavailable.
  await Promise.all(
    readingAssets
      .map((row) => row.storagePath)
      .filter((path): path is string => Boolean(path))
      .map(async (storagePath) => {
        try {
          await del(storagePath);
        } catch {
          // ignore
        }
      }),
  );

  await db.delete(workspaces).where(eq(workspaces.userId, userId));
  await db
    .delete(aiUsageReservations)
    .where(eq(aiUsageReservations.userId, userId));
  await db.delete(aiUsage).where(eq(aiUsage.userId, userId));

  await db
    .update(users)
    .set({
      image: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}
