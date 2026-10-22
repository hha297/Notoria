"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { exerciseInstructionPresets } from "@/db/schema";
import { getCurrentUserRecord } from "@/lib/auth/current-user";
import { entitlementPlan, featureEnabled } from "@/lib/billing/plans";
import { normalizeAdditionalInstructions } from "@/lib/exercises/additional-instructions";
import {
  normalizePresetSettings,
  serializePresetSettings,
  type ExercisePresetSettings,
} from "@/lib/exercises/preset-settings";

const scopeSchema = z.enum(["vocabulary", "theory"]);
const MAX_PRESETS = 40;

export type ExerciseInstructionPresetItem = {
  id: string;
  name: string;
  instructions: string;
  settings: ExercisePresetSettings;
  scope: "vocabulary" | "theory";
};

type PresetFailure = {
  ok: false;
  code: "PREMIUM_REQUIRED" | "UNAUTHORIZED" | "INVALID" | "NOT_FOUND" | "LIMIT";
};

async function requirePremiumOwner(): Promise<
  { ok: true; userId: string } | PresetFailure
> {
  const user = await getCurrentUserRecord();
  if (!user || user.suspendedAt) return { ok: false, code: "UNAUTHORIZED" };
  if (!featureEnabled(entitlementPlan(user), "exercise_custom_instructions")) {
    return { ok: false, code: "PREMIUM_REQUIRED" };
  }
  return { ok: true, userId: user.id };
}

function toItem(row: {
  id: string;
  name: string;
  instructions: string;
  settings: unknown;
  scope: string;
}): ExerciseInstructionPresetItem | null {
  const scope = scopeSchema.safeParse(row.scope);
  if (!scope.success) return null;
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    settings: normalizePresetSettings(row.settings),
    scope: scope.data,
  };
}

export async function listExerciseInstructionPresets(
  scope: "vocabulary" | "theory",
): Promise<ExerciseInstructionPresetItem[]> {
  const parsed = scopeSchema.safeParse(scope);
  const access = await requirePremiumOwner();
  if (!parsed.success || !access.ok) return [];

  const rows = await db
    .select({
      id: exerciseInstructionPresets.id,
      name: exerciseInstructionPresets.name,
      instructions: exerciseInstructionPresets.instructions,
      settings: exerciseInstructionPresets.settings,
      scope: exerciseInstructionPresets.scope,
    })
    .from(exerciseInstructionPresets)
    .where(
      and(
        eq(exerciseInstructionPresets.userId, access.userId),
        eq(exerciseInstructionPresets.scope, parsed.data),
      ),
    )
    .orderBy(asc(exerciseInstructionPresets.name));

  return rows.flatMap((row) => {
    const item = toItem(row);
    return item ? [item] : [];
  });
}

export async function createExerciseInstructionPreset(input: {
  name: string;
  instructions: string;
  settings?: ExercisePresetSettings;
  scope: "vocabulary" | "theory";
}): Promise<{ ok: true; preset: ExerciseInstructionPresetItem } | PresetFailure> {
  const access = await requirePremiumOwner();
  if (!access.ok) return access;

  const name = input.name.trim();
  const instructions = normalizeAdditionalInstructions(input.instructions) ?? "";
  const settings = serializePresetSettings(input.settings);
  const scope = scopeSchema.safeParse(input.scope);
  if (!scope.success || name.length < 1 || name.length > 80) {
    return { ok: false, code: "INVALID" };
  }

  const existing = await db
    .select({ id: exerciseInstructionPresets.id })
    .from(exerciseInstructionPresets)
    .where(
      and(
        eq(exerciseInstructionPresets.userId, access.userId),
        eq(exerciseInstructionPresets.scope, scope.data),
      ),
    );
  if (existing.length >= MAX_PRESETS) return { ok: false, code: "LIMIT" };

  const [row] = await db
    .insert(exerciseInstructionPresets)
    .values({
      userId: access.userId,
      name,
      instructions,
      settings,
      scope: scope.data,
    })
    .returning({
      id: exerciseInstructionPresets.id,
      name: exerciseInstructionPresets.name,
      instructions: exerciseInstructionPresets.instructions,
      settings: exerciseInstructionPresets.settings,
      scope: exerciseInstructionPresets.scope,
    });

  if (!row) return { ok: false, code: "INVALID" };
  const preset = toItem(row);
  if (!preset) return { ok: false, code: "INVALID" };
  return { ok: true, preset };
}

export async function updateExerciseInstructionPreset(input: {
  id: string;
  name?: string;
  instructions?: string;
  settings?: ExercisePresetSettings;
}): Promise<{ ok: true; preset: ExerciseInstructionPresetItem } | PresetFailure> {
  const access = await requirePremiumOwner();
  if (!access.ok) return access;

  const id = input.id.trim();
  const name = input.name?.trim();
  if (!id || (name !== undefined && (name.length < 1 || name.length > 80))) {
    return { ok: false, code: "INVALID" };
  }

  const patch: {
    name?: string;
    instructions?: string;
    settings?: Record<string, unknown>;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (name) patch.name = name;
  if (input.instructions !== undefined) {
    patch.instructions =
      normalizeAdditionalInstructions(input.instructions) ?? "";
  }
  if (input.settings !== undefined) {
    patch.settings = serializePresetSettings(input.settings);
  }

  if (!patch.name && patch.instructions === undefined && !patch.settings) {
    return { ok: false, code: "INVALID" };
  }

  const [row] = await db
    .update(exerciseInstructionPresets)
    .set(patch)
    .where(
      and(
        eq(exerciseInstructionPresets.id, id),
        eq(exerciseInstructionPresets.userId, access.userId),
      ),
    )
    .returning({
      id: exerciseInstructionPresets.id,
      name: exerciseInstructionPresets.name,
      instructions: exerciseInstructionPresets.instructions,
      settings: exerciseInstructionPresets.settings,
      scope: exerciseInstructionPresets.scope,
    });

  if (!row) return { ok: false, code: "NOT_FOUND" };
  const preset = toItem(row);
  if (!preset) return { ok: false, code: "INVALID" };
  return { ok: true, preset };
}

export async function deleteExerciseInstructionPreset(
  id: string,
): Promise<{ ok: true } | PresetFailure> {
  const access = await requirePremiumOwner();
  if (!access.ok) return access;
  if (!id.trim()) return { ok: false, code: "INVALID" };

  const [row] = await db
    .delete(exerciseInstructionPresets)
    .where(
      and(
        eq(exerciseInstructionPresets.id, id),
        eq(exerciseInstructionPresets.userId, access.userId),
      ),
    )
    .returning({ id: exerciseInstructionPresets.id });

  if (!row) return { ok: false, code: "NOT_FOUND" };
  return { ok: true };
}
