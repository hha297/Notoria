"use server";

import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  exercises,
  grammarNotes,
  listeningLessons,
  speakingSessions,
  users,
  vocabularyWords,
  workspaces,
} from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  configureCloudinary,
  extractCloudinaryPublicId,
  getAvatarPublicId,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { getStripeClient } from "@/lib/stripe/client";
import { isStripeConfigured } from "@/lib/stripe/config";
import { toBillingState } from "@/lib/stripe/pro";
import { reconcileUserSubscription } from "@/lib/stripe/subscription";
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/account/constants";

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
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "SAME_AS_CURRENT",
    path: ["newPassword"],
  });

const updateNameSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function getAccountUser() {
  const userId = await getCurrentUserId();

  try {
    await reconcileUserSubscription(userId);
  } catch (error) {
    console.error("Stripe subscription reconcile failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
      code:
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined,
    });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      role: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      stripeCurrentPeriodEnd: true,
      stripeCancelAtPeriodEnd: true,
      scheduledSubscriptionPlan: true,
      introOfferUsedAt: true,
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    passwordHash: user.passwordHash,
    billing: await toBillingState(user),
  };
}

export async function verifyCurrentPassword(currentPassword: string) {
  const password = currentPassword.trim();
  if (!password) {
    return { valid: false as const };
  }

  const userId = await getCurrentUserId();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error("PASSWORD_NOT_SET");
  }

  const valid = await compare(password, user.passwordHash);
  return { valid };
}

export async function updatePassword(
  data: z.infer<typeof updatePasswordSchema>,
) {
  const parsed = updatePasswordSchema.safeParse(data);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message);
    if (messages.includes("PASSWORD_MISMATCH")) {
      throw new Error("PASSWORD_MISMATCH");
    }
    if (messages.includes("SAME_AS_CURRENT")) {
      throw new Error("SAME_AS_CURRENT");
    }
    throw new Error("INVALID_PASSWORD");
  }

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

  const valid = await compare(parsed.data.currentPassword, user.passwordHash);

  if (!valid) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  const sameAsCurrent = await compare(parsed.data.newPassword, user.passwordHash);
  if (sameAsCurrent) {
    throw new Error("SAME_AS_CURRENT");
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);

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

const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_ACCOUNT_CONFIRMATION),
});

async function destroyCloudinaryPublicId(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
) {
  if (!isCloudinaryConfigured() || !publicId) {
    return;
  }

  try {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch {
    // Best-effort cleanup — account deletion continues.
  }
}

async function cancelStripeSubscription(input: {
  subscriptionId: string | null;
  customerId: string | null;
}) {
  if (!isStripeConfigured()) {
    return;
  }

  try {
    const stripe = getStripeClient();

    if (input.subscriptionId) {
      try {
        await stripe.subscriptions.cancel(input.subscriptionId);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        if (code !== "resource_missing") {
          console.warn("Failed to cancel Stripe subscription on account delete", {
            subscriptionId: input.subscriptionId,
            code,
          });
        }
      }
    }

    if (input.customerId) {
      try {
        await stripe.customers.del(input.customerId);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        if (code !== "resource_missing") {
          console.warn("Failed to delete Stripe customer on account delete", {
            customerId: input.customerId,
            code,
          });
        }
      }
    }
  } catch {
    // Stripe may be misconfigured at runtime; still delete the local account.
  }
}

export async function exportAccountBackup() {
  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  const [
    userWorkspaces,
    words,
    notes,
    userExercises,
    lessons,
    sessions,
  ] = await Promise.all([
    db.query.workspaces.findMany({
      where: eq(workspaces.userId, userId),
      with: {
        tags: true,
        folders: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    db.query.vocabularyWords.findMany({
      where: eq(vocabularyWords.userId, userId),
      with: {
        meanings: true,
        examples: true,
        tags: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    db.query.grammarNotes.findMany({
      where: eq(grammarNotes.userId, userId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    db.query.exercises.findMany({
      where: eq(exercises.userId, userId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    db.query.listeningLessons.findMany({
      where: eq(listeningLessons.userId, userId),
      with: {
        exercises: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    db.query.speakingSessions.findMany({
      where: eq(speakingSessions.userId, userId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
  ]);

  return {
    version: 1 as const,
    format: "notoria-account-backup" as const,
    exportedAt: new Date().toISOString(),
    app: "notoria",
    account: {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
    workspaces: userWorkspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      language: workspace.language,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      tags: workspace.tags.map((tag) => tag.name),
      folders: workspace.folders.map((folder) => ({
        id: folder.id,
        section: folder.section,
        name: folder.name,
        parentId: folder.parentId,
      })),
    })),
    vocabulary: words.map((word) => ({
      id: word.id,
      workspaceId: word.workspaceId,
      word: word.word,
      partOfSpeech: word.partOfSpeech,
      synonyms: word.synonyms,
      notes: word.notes,
      status: word.status,
      meanings: word.meanings.map((meaning) => ({
        meaning: meaning.meaning,
        isPrimary: meaning.isPrimary,
        sortOrder: meaning.sortOrder,
      })),
      examples: word.examples.map((example) => ({
        sentence: example.sentence,
        meaning: example.meaning,
        notes: example.notes,
        sortOrder: example.sortOrder,
      })),
      tags: word.tags.map((tag) => tag.tag),
      createdAt: word.createdAt.toISOString(),
      updatedAt: word.updatedAt.toISOString(),
    })),
    theory: notes.map((note) => ({
      id: note.id,
      workspaceId: note.workspaceId,
      folderId: note.folderId,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    exercises: userExercises.map((exercise) => ({
      id: exercise.id,
      workspaceId: exercise.workspaceId,
      folderId: exercise.folderId,
      title: exercise.title,
      description: exercise.description,
      type: exercise.type,
      content: exercise.content,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    })),
    listening: lessons.map((lesson) => ({
      id: lesson.id,
      workspaceId: lesson.workspaceId,
      folderId: lesson.folderId,
      title: lesson.title,
      originalFilename: lesson.originalFilename,
      mediaUrl: lesson.cloudinaryUrl,
      mediaPublicId: lesson.cloudinaryPublicId,
      mediaType: lesson.mediaType,
      format: lesson.format,
      duration: lesson.duration,
      transcript: lesson.transcript,
      transcriptionData: lesson.transcriptionData,
      language: lesson.language,
      cefrLevel: lesson.cefrLevel,
      topic: lesson.topic,
      formality: lesson.formality,
      exerciseType: lesson.exerciseType,
      status: lesson.status,
      exercises: lesson.exercises.map((item) => ({
        type: item.type,
        question: item.question,
        data: item.data,
        correctAnswer: item.correctAnswer,
        sortOrder: item.sortOrder,
      })),
      createdAt: lesson.createdAt.toISOString(),
      updatedAt: lesson.updatedAt.toISOString(),
    })),
    speaking: sessions.map((session) => ({
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      language: session.language,
      topic: session.topic,
      cefrLevel: session.cefrLevel,
      notes: session.notes,
      status: session.status,
      transcript: session.transcript,
      transcriptUrl: session.transcriptUrl,
      recordingUrl: session.recordingUrl,
      summary: session.summary,
      startedAt: session.startedAt?.toISOString() ?? null,
      endedAt: session.endedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    })),
    notes: [
      "Media files (listening audio/video, speaking recordings, profile photo) are referenced by URL when available but are not embedded in this JSON file.",
      "Import restores learning data only. Account name, email, login, and subscription are never changed by a backup import.",
      "Writing documents are included under exercises with type WRITING.",
    ],
  };
}

export async function deleteAccount(
  data: z.infer<typeof deleteAccountSchema>,
) {
  const parsed = deleteAccountSchema.parse(data);
  if (parsed.confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
    throw new Error("INVALID_CONFIRMATION");
  }

  const userId = await getCurrentUserId();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      image: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  const listeningAssets = await db.query.listeningLessons.findMany({
    where: eq(listeningLessons.userId, userId),
    columns: {
      cloudinaryPublicId: true,
    },
  });

  await cancelStripeSubscription({
    subscriptionId: user.stripeSubscriptionId,
    customerId: user.stripeCustomerId,
  });

  if (user.image) {
    await deleteCloudinaryAsset(user.image);
    await destroyCloudinaryPublicId(getAvatarPublicId(userId), "image");
  }

  await Promise.all(
    listeningAssets.map((lesson) =>
      destroyCloudinaryPublicId(lesson.cloudinaryPublicId, "video"),
    ),
  );

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/", "layout");
  revalidatePath("/account");

  return { ok: true as const };
}
