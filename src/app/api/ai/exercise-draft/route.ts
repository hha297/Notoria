import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiExerciseDrafts } from "@/db/schema";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { authErrorResponse } from "@/lib/auth/http";
import {
  EXERCISE_BATCH_TTL_MS,
  exerciseBatchKeys,
} from "@/lib/exercises/exercise-batch-store";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["load", "save", "delete", "claim"]),
  slot: z.enum(["active", "upcoming"]).optional().default("active"),
  scope: z.string().trim().min(1).max(2_000),
  config: z.string().trim().min(1).max(12_000),
  payload: z.array(z.unknown()).max(40).optional(),
});

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let user;
  try {
    user = await getCurrentUserRecord();
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const scopeKey = digest(parsed.data.scope);
  const { draftKey } = exerciseBatchKeys({
    scope: parsed.data.scope,
    config: parsed.data.config,
    slot: parsed.data.slot,
  });
  const now = new Date();

  // Opportunistic per-user cleanup keeps expired config variants from piling up.
  await db
    .delete(aiExerciseDrafts)
    .where(
      and(
        eq(aiExerciseDrafts.userId, user.id),
        lte(aiExerciseDrafts.expiresAt, now),
      ),
    );

  if (parsed.data.action === "delete") {
    await db
      .delete(aiExerciseDrafts)
      .where(
        and(
          eq(aiExerciseDrafts.userId, user.id),
          eq(aiExerciseDrafts.draftKey, draftKey),
        ),
      );
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "claim") {
    if (parsed.data.slot !== "upcoming") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const payload = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .delete(aiExerciseDrafts)
        .where(
          and(
            eq(aiExerciseDrafts.userId, user.id),
            eq(aiExerciseDrafts.draftKey, draftKey),
            gt(aiExerciseDrafts.expiresAt, now),
          ),
        )
        .returning({ payload: aiExerciseDrafts.payload });
      if (!Array.isArray(claimed?.payload)) return null;
      const active = exerciseBatchKeys({
        scope: parsed.data.scope,
        config: parsed.data.config,
        slot: "active",
      });
      await tx
        .insert(aiExerciseDrafts)
        .values({
          userId: user.id,
          ...active,
          batchSlot: "active",
          payload: claimed.payload,
          expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [aiExerciseDrafts.userId, aiExerciseDrafts.draftKey],
          set: {
            payload: claimed.payload,
            batchSlot: "active",
            expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
            updatedAt: now,
          },
        });
      return claimed.payload;
    });
    return NextResponse.json({ ok: true, payload });
  }

  if (parsed.data.action === "load") {
    const [draft] = await db
      .select({ payload: aiExerciseDrafts.payload })
      .from(aiExerciseDrafts)
      .where(
        and(
          eq(aiExerciseDrafts.userId, user.id),
          eq(aiExerciseDrafts.draftKey, draftKey),
          gt(aiExerciseDrafts.expiresAt, now),
        ),
      )
      .limit(1);
    return NextResponse.json({
      ok: true,
      payload: Array.isArray(draft?.payload) ? draft.payload : null,
    });
  }

  if (!parsed.data.payload?.length) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (JSON.stringify(parsed.data.payload).length > 500_000) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  await db
    .insert(aiExerciseDrafts)
    .values({
      userId: user.id,
      scopeKey,
      draftKey,
      batchSlot: parsed.data.slot,
      payload: parsed.data.payload,
      expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiExerciseDrafts.userId, aiExerciseDrafts.draftKey],
      set: {
        payload: parsed.data.payload,
        batchSlot: parsed.data.slot,
        expiresAt: new Date(now.getTime() + EXERCISE_BATCH_TTL_MS),
        updatedAt: now,
      },
    });

  return NextResponse.json({ ok: true });
}
