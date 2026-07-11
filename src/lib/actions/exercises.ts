"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { getCurrentUserId } from "@/lib/auth/demo-user";
import {
  exerciseFormSchema,
  type ExerciseFormValues,
} from "@/schemas/exercise";

export async function getExercises() {
  const userId = await getCurrentUserId();

  return db.query.exercises.findMany({
    where: eq(exercises.userId, userId),
    orderBy: [desc(exercises.updatedAt)],
  });
}

export async function getExercise(id: string) {
  const userId = await getCurrentUserId();

  const exercise = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (!exercise || exercise.userId !== userId) {
    return null;
  }

  return exercise;
}

export async function createExercise(data: ExerciseFormValues) {
  const parsed = exerciseFormSchema.parse(data);
  const userId = await getCurrentUserId();

  const [exercise] = await db
    .insert(exercises)
    .values({
      userId,
      title: parsed.title,
      type: parsed.type,
      content: parsed.content,
    })
    .returning();

  revalidatePath("/exercises");
  return exercise;
}

export async function updateExercise(id: string, data: ExerciseFormValues) {
  const parsed = exerciseFormSchema.parse(data);
  const userId = await getCurrentUserId();

  const existing = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Exercise not found");
  }

  const [exercise] = await db
    .update(exercises)
    .set({
      title: parsed.title,
      type: parsed.type,
      content: parsed.content,
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id))
    .returning();

  revalidatePath("/exercises");
  revalidatePath(`/exercises/${id}`);
  return exercise;
}

export async function deleteExercise(id: string) {
  const userId = await getCurrentUserId();

  const existing = await db.query.exercises.findFirst({
    where: eq(exercises.id, id),
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Exercise not found");
  }

  await db.delete(exercises).where(eq(exercises.id, id));
  revalidatePath("/exercises");
}
