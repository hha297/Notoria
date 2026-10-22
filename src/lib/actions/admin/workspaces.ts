"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { sanitizeAdminMeta, writeAdminAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  isLegacyLanguageCode,
  isSelectableLanguageCode,
} from "@/lib/languages";
import { resolveWorkspaceName } from "@/lib/workspace-names";

const createSchema = z
  .object({
    userId: z.string().uuid().optional(),
    ownerEmail: z.string().email().optional(),
    language: z.string().min(2),
    name: z.string().trim().max(80).optional(),
  })
  .refine((value) => Boolean(value.userId || value.ownerEmail), {
    message: "USER_NOT_FOUND",
  });

const updateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  language: z.string().min(2),
});

function revalidateWorkspace(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/workspaces");
  revalidatePath("/admin/audit");
  if (id) revalidatePath(`/admin/workspaces/${id}`);
}

export async function adminCreateWorkspace(input: z.infer<typeof createSchema>) {
  const admin = await requireAdmin();
  const parsed = createSchema.parse(input);
  if (!isSelectableLanguageCode(parsed.language)) {
    throw new Error("INVALID_LANGUAGE");
  }

  const ownerRow = parsed.userId
    ? await db.query.users.findFirst({
        where: eq(users.id, parsed.userId),
        columns: { id: true },
      })
    : await db.query.users.findFirst({
        where: eq(users.email, parsed.ownerEmail!.toLowerCase().trim()),
        columns: { id: true },
      });
  if (!ownerRow) throw new Error("USER_NOT_FOUND");
  const ownerUserId = ownerRow.id;

  const existing = await db.query.workspaces.findFirst({
    where: and(
      eq(workspaces.userId, ownerUserId),
      eq(workspaces.language, parsed.language),
    ),
  });
  if (existing) throw new Error("WORKSPACE_LANGUAGE_EXISTS");

  let createdId = "";
  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(workspaces)
      .values({
        userId: ownerUserId,
        language: parsed.language,
        name: resolveWorkspaceName(parsed.name, parsed.language),
      })
      .returning();
    createdId = row.id;
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "workspace.create",
        entityType: "workspace",
        entityId: row.id,
        targetUserId: ownerUserId,
        meta: sanitizeAdminMeta({
          name: row.name,
          language: row.language,
        }),
      },
      tx,
    );
  });

  revalidateWorkspace(createdId);
  return { id: createdId };
}

export async function adminUpdateWorkspace(input: z.infer<typeof updateSchema>) {
  const admin = await requireAdmin();
  const parsed = updateSchema.parse(input);

  const before = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, parsed.workspaceId),
  });
  if (!before) throw new Error("WORKSPACE_NOT_FOUND");

  const keepingLegacy =
    parsed.language === before.language && isLegacyLanguageCode(parsed.language);
  if (!isSelectableLanguageCode(parsed.language) && !keepingLegacy) {
    throw new Error("INVALID_LANGUAGE");
  }

  const conflict = await db.query.workspaces.findFirst({
    where: and(
      eq(workspaces.userId, before.userId),
      eq(workspaces.language, parsed.language),
    ),
  });
  if (conflict && conflict.id !== before.id) {
    throw new Error("WORKSPACE_LANGUAGE_EXISTS");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        name: parsed.name,
        language: parsed.language,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, parsed.workspaceId));
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "workspace.update",
        entityType: "workspace",
        entityId: parsed.workspaceId,
        targetUserId: before.userId,
        meta: sanitizeAdminMeta({
          before: { name: before.name, language: before.language },
          after: { name: parsed.name, language: parsed.language },
        }),
      },
      tx,
    );
  });

  revalidateWorkspace(parsed.workspaceId);
  return { ok: true as const };
}

export async function adminDeleteWorkspace(input: { workspaceId: string }) {
  const admin = await requireAdmin();
  const workspaceId = z.string().uuid().parse(input.workspaceId);

  const before = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });
  if (!before) throw new Error("WORKSPACE_NOT_FOUND");

  await db.transaction(async (tx) => {
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "workspace.delete",
        entityType: "workspace",
        entityId: workspaceId,
        targetUserId: before.userId,
        meta: sanitizeAdminMeta({
          name: before.name,
          language: before.language,
        }),
      },
      tx,
    );
    // FK cascades remove learning content owned by this workspace.
    await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
  });

  revalidateWorkspace();
  return { ok: true as const };
}
