"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { db } from "@/db";
import { listeningExercises, listeningLessons } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  configureCloudinary,
  getListeningFolder,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { ListeningError, toListeningError } from "@/lib/listening/errors";
import { generateListeningExercisesFromTranscript } from "@/lib/listening/generate";
import { assignDialogueSpeakers } from "@/lib/listening/infer-speakers";
import { resolveListeningMediaFromUrl } from "@/lib/listening/media-resolver";
import {
  isMultiSpeakerTranscript,
  SPEAKER_ASSIGNMENT_VERSION,
} from "@/lib/listening/speakers";
import {
  parseTranscriptionData,
  toListeningLessonDetail,
  toListeningListItem,
} from "@/lib/listening/serialize";
import { transcribeListeningMedia } from "@/lib/listening/transcribe";
import type {
  ListeningLessonDetail,
  ListeningLessonListItem,
} from "@/lib/listening/types";
import {
  isAllowedListeningFile,
  mediaTypeFromFormat,
  MAX_LISTENING_FILE_SIZE,
  titleFromFilename,
  toTranscriptionData,
} from "@/lib/listening/utils";
import { getActiveWorkspace, requireActiveWorkspace } from "@/lib/workspace";
import {
  listeningCefrSchema,
  listeningFormalitySchema,
  listeningPracticeTypeSchema,
  listeningUploadMetaSchema,
} from "@/schemas/listening";
import type { ListeningPracticeType } from "@/lib/listening/types";
import type { WritingCefr, WritingFormality } from "@/lib/writing/meta";

function revalidateListening(id?: string) {
  revalidatePath("/listening");
  if (id) {
    revalidatePath(`/listening/${id}`);
    revalidatePath(`/listening/${id}/practice`);
  }
}

function optionalCefr(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "" || value === "none") {
    return null;
  }
  const parsed = listeningCefrSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function optionalFormality(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "" || value === "none") {
    return null;
  }
  const parsed = listeningFormalitySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function requireOwnedLesson(id: string) {
  const userId = await getCurrentUserId();
  const workspace = await requireActiveWorkspace();

  const lesson = await db.query.listeningLessons.findFirst({
    where: eq(listeningLessons.id, id),
    with: {
      exercises: true,
    },
  });

  if (
    !lesson ||
    lesson.userId !== userId ||
    lesson.workspaceId !== workspace.id
  ) {
    throw new ListeningError("LESSON_NOT_FOUND");
  }

  return { lesson, userId, workspace };
}

async function markLessonFailed(id: string, error: unknown) {
  const listeningError = toListeningError(error);
  await db
    .update(listeningLessons)
    .set({
      status: "FAILED",
      errorCode: listeningError.code,
      updatedAt: new Date(),
    })
    .where(eq(listeningLessons.id, id));
  revalidateListening(id);
  return listeningError;
}

async function uploadListeningAsset(input: {
  file: File;
  userId: string;
  workspaceId: string;
}) {
  if (!isCloudinaryConfigured()) {
    throw new ListeningError("CLOUDINARY_NOT_CONFIGURED");
  }

  const cloudinary = configureCloudinary();
  const buffer = Buffer.from(await input.file.arrayBuffer());

  return new Promise<{
    secure_url: string;
    public_id: string;
    format?: string;
    duration?: number;
    resource_type?: string;
  }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: getListeningFolder(input.userId, input.workspaceId),
        resource_type: "video",
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error || !uploadResult?.secure_url || !uploadResult.public_id) {
          reject(new ListeningError("PROCESSING_FAILED"));
          return;
        }

        resolve({
          secure_url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          duration:
            typeof uploadResult.duration === "number"
              ? Math.round(uploadResult.duration)
              : undefined,
          resource_type: uploadResult.resource_type,
        });
      },
    );

    upload.end(buffer);
  });
}

async function destroyListeningAsset(publicId: string) {
  if (!isCloudinaryConfigured() || !publicId) {
    return;
  }

  try {
    const cloudinary = configureCloudinary();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
      invalidate: true,
    });
  } catch {
    // Keep the lesson delete even if Cloudinary cleanup fails.
  }
}

export async function getListeningLessons(): Promise<
  ListeningLessonListItem[]
> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return [];
  }

  const lessons = await db.query.listeningLessons.findMany({
    where: and(
      eq(listeningLessons.userId, userId),
      eq(listeningLessons.workspaceId, workspace.id),
    ),
    orderBy: [desc(listeningLessons.updatedAt)],
    with: {
      exercises: {
        columns: { id: true, type: true },
      },
    },
  });

  return lessons.map(toListeningListItem);
}

export async function getListeningLesson(
  id: string,
): Promise<ListeningLessonDetail | null> {
  const userId = await getCurrentUserId();
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return null;
  }

  const lesson = await db.query.listeningLessons.findFirst({
    where: eq(listeningLessons.id, id),
    with: { exercises: true },
  });

  if (
    !lesson ||
    lesson.userId !== userId ||
    lesson.workspaceId !== workspace.id
  ) {
    return null;
  }

  return toListeningLessonDetail(lesson);
}

function parseLessonMeta(formData: FormData) {
  return listeningUploadMetaSchema.parse({
    title:
      typeof formData.get("title") === "string"
        ? String(formData.get("title"))
        : "",
    cefrLevel: optionalCefr(formData.get("cefrLevel")),
    topic:
      typeof formData.get("topic") === "string" &&
      formData.get("topic") !== "none"
        ? String(formData.get("topic"))
        : null,
    formality: optionalFormality(formData.get("formality")),
  });
}

async function persistUploadedListeningLesson(input: {
  file: File;
  titleFallback: string;
  durationFallback?: number | null;
  userId: string;
  workspaceId: string;
  language: string;
  meta: ReturnType<typeof parseLessonMeta>;
}) {
  const upload = await uploadListeningAsset({
    file: input.file,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  const title = input.meta.title?.trim() || input.titleFallback;
  const format =
    upload.format ?? input.file.name.split(".").pop()?.toLowerCase() ?? null;

  const [lesson] = await db
    .insert(listeningLessons)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      title,
      cloudinaryUrl: upload.secure_url,
      cloudinaryPublicId: upload.public_id,
      mediaType: mediaTypeFromFormat(format ?? undefined, input.file.type),
      format,
      duration: upload.duration ?? input.durationFallback ?? null,
      cefrLevel: input.meta.cefrLevel,
      topic: input.meta.topic,
      formality: input.meta.formality,
      language: input.language,
      status: "TRANSCRIBING",
      errorCode: null,
    })
    .returning();

  revalidateListening(lesson.id);
  return { id: lesson.id };
}

export async function createListeningLesson(formData: FormData) {
  try {
    const userId = await getCurrentUserId();
    const workspace = await requireActiveWorkspace();
    const source = formData.get("source") === "url" ? "url" : "file";
    const file = formData.get("file");
    const mediaUrl =
      typeof formData.get("mediaUrl") === "string"
        ? String(formData.get("mediaUrl"))
        : "";
    const meta = parseLessonMeta(formData);

    if (source === "url") {
      if (file instanceof File && file.size > 0) {
        throw new ListeningError("INVALID_FILE");
      }

      const resolved = await resolveListeningMediaFromUrl(mediaUrl);
      const extracted = new File(
        [new Uint8Array(resolved.buffer)],
        resolved.filename,
        { type: resolved.mimeType },
      );

      return persistUploadedListeningLesson({
        file: extracted,
        titleFallback: resolved.title || "Listening",
        durationFallback: resolved.duration,
        userId,
        workspaceId: workspace.id,
        language: workspace.language,
        meta,
      });
    }

    if (!(file instanceof File) || file.size === 0) {
      throw new ListeningError("INVALID_FILE");
    }

    if (mediaUrl.trim()) {
      throw new ListeningError("INVALID_FILE");
    }

    if (!isAllowedListeningFile(file)) {
      throw new ListeningError("INVALID_FILE_TYPE");
    }

    if (file.size > MAX_LISTENING_FILE_SIZE) {
      throw new ListeningError("FILE_TOO_LARGE");
    }

    return persistUploadedListeningLesson({
      file,
      titleFallback: titleFromFilename(file.name),
      userId,
      workspaceId: workspace.id,
      language: workspace.language,
      meta,
    });
  } catch (error) {
    return { error: toListeningError(error).code };
  }
}

export async function transcribeListeningLesson(id: string) {
  const { lesson, workspace } = await requireOwnedLesson(id);

  await db
    .update(listeningLessons)
    .set({
      status: "TRANSCRIBING",
      errorCode: null,
      updatedAt: new Date(),
    })
    .where(eq(listeningLessons.id, id));
  revalidateListening(id);

  try {
    const result = await transcribeListeningMedia({
      audioUrl: lesson.cloudinaryUrl,
      languageHint: workspace.language,
    });

    const [updated] = await db
      .update(listeningLessons)
      .set({
        transcript: result.transcript,
        transcriptionData: result.transcriptionData,
        language: result.language ?? workspace.language,
        duration: result.duration ?? lesson.duration,
        status: "COMPLETED",
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(listeningLessons.id, id))
      .returning();

    revalidateListening(id);
    return { id: updated.id };
  } catch (error) {
    const listeningError = await markLessonFailed(id, error);
    throw listeningError;
  }
}

export async function generateListeningExercises(
  id: string,
  type: ListeningPracticeType,
) {
  const exerciseType = listeningPracticeTypeSchema.parse(type);
  const { lesson } = await requireOwnedLesson(id);

  if (!lesson.transcript?.trim()) {
    throw new ListeningError("EMPTY_TRANSCRIPT");
  }

  try {
    const generated = await generateListeningExercisesFromTranscript({
      transcript: lesson.transcript,
      exerciseType,
      durationSeconds: lesson.duration,
      utterances: parseTranscriptionData(lesson.transcriptionData)?.utterances,
      language: lesson.language,
      uiLocale: await getLocale(),
      cefrLevel: (lesson.cefrLevel as WritingCefr | null) ?? null,
      topic: lesson.topic,
      formality: (lesson.formality as WritingFormality | null) ?? null,
      fallbackTitle: lesson.title,
    });

    await db
      .delete(listeningExercises)
      .where(
        and(
          eq(listeningExercises.lessonId, id),
          eq(listeningExercises.type, exerciseType),
        ),
      );

    if (generated.exercises.length > 0) {
      await db.insert(listeningExercises).values(
        generated.exercises.map((exercise, index) => ({
          lessonId: id,
          type: exercise.type,
          question: exercise.question,
          data: exercise.data,
          correctAnswer: exercise.correctAnswer,
          sortOrder: index,
        })),
      );
    }

    await db
      .update(listeningLessons)
      .set({
        title: generated.title || lesson.title,
        cefrLevel: generated.cefrLevel ?? lesson.cefrLevel,
        topic: generated.topic ?? lesson.topic,
        formality: generated.formality ?? lesson.formality,
        exerciseType: generated.exerciseType,
        status: "COMPLETED",
        errorCode: null,
        updatedAt: new Date(),
      })
      .where(eq(listeningLessons.id, id));

    revalidateListening(id);
    return { id, exerciseType, count: generated.exercises.length };
  } catch (error) {
    throw toListeningError(error);
  }
}

export async function ensureListeningSpeakers(id: string) {
  const { lesson } = await requireOwnedLesson(id);
  const transcript = lesson.transcript?.trim();
  if (!transcript) {
    return { id, updated: false };
  }

  const current = parseTranscriptionData(lesson.transcriptionData);
  if (current && isMultiSpeakerTranscript(current.utterances)) {
    return { id, updated: false };
  }

  if (
    current &&
    (current.speakerAssignmentVersion ?? 0) >= SPEAKER_ASSIGNMENT_VERSION
  ) {
    return { id, updated: false };
  }

  const assigned = await assignDialogueSpeakers({
    transcript,
    sentences: current?.sentences ?? [],
  });
  const utterances = isMultiSpeakerTranscript(assigned.utterances)
    ? assigned.utterances
    : (current?.utterances ?? []);

  await db
    .update(listeningLessons)
    .set({
      transcriptionData: toTranscriptionData({
        words: current?.words,
        sentences: current?.sentences,
        utterances,
        speakerMap: assigned.speakerMap,
        speakersResolved: true,
        speakerAssignmentVersion: SPEAKER_ASSIGNMENT_VERSION,
        audioDuration: current?.audioDuration ?? lesson.duration,
      }),
      updatedAt: new Date(),
    })
    .where(eq(listeningLessons.id, id));

  revalidateListening(id);
  return { id, updated: true };
}

export async function processListeningLesson(id: string) {
  const { lesson } = await requireOwnedLesson(id);

  try {
    if (!lesson.transcript?.trim()) {
      await transcribeListeningLesson(id);
      return { id };
    }

    if (lesson.status !== "COMPLETED") {
      await db
        .update(listeningLessons)
        .set({
          status: "COMPLETED",
          errorCode: null,
          updatedAt: new Date(),
        })
        .where(eq(listeningLessons.id, id));
      revalidateListening(id);
    }

    return { id };
  } catch (error) {
    throw toListeningError(error);
  }
}

export async function deleteListeningLesson(id: string) {
  const { lesson } = await requireOwnedLesson(id);

  await db.delete(listeningLessons).where(eq(listeningLessons.id, id));
  await destroyListeningAsset(lesson.cloudinaryPublicId);
  revalidateListening(id);
}
