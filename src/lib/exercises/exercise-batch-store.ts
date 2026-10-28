import { createHash } from "node:crypto";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { aiExerciseDrafts } from "@/db/schema";

export const EXERCISE_BATCH_TTL_MS = 24 * 60 * 60 * 1_000;
export type ExerciseBatchSlot = "active" | "upcoming";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function exerciseBatchKeys(input: {
  scope: string;
  config: string;
  slot: ExerciseBatchSlot;
}) {
  return {
    scopeKey: digest(input.scope),
    draftKey: digest(`${input.scope}\0${input.config}\0${input.slot}`),
  };
}

export async function saveExerciseBatch(input: {
  userId: string;
  scope: string;
  config: string;
  slot: ExerciseBatchSlot;
  payload: unknown[];
}) {
  if (input.payload.length === 0) return;
  const now = new Date();
  const keys = exerciseBatchKeys(input);
  await db
    .delete(aiExerciseDrafts)
    .where(
      and(
        eq(aiExerciseDrafts.userId, input.userId),
        lte(aiExerciseDrafts.expiresAt, now),
      ),
    );
  await db
    .insert(aiExerciseDrafts)
    .values({
      userId: input.userId,
      ...keys,
      batchSlot: input.slot,
      payload: input.payload,
      expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiExerciseDrafts.userId, aiExerciseDrafts.draftKey],
      set: {
        payload: input.payload,
        batchSlot: input.slot,
        expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
        updatedAt: now,
      },
    });
}
