"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { purgeUserLearningData } from "@/lib/account/purge-learning-data";
import { sanitizeAdminMeta, writeAdminAudit } from "@/lib/admin/audit";
import { assertNotLastActiveAdmin } from "@/lib/admin/last-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getStripeClient } from "@/lib/stripe/client";
import { isStripeConfigured } from "@/lib/stripe/config";

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
});

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["USER", "ADMIN"]),
});

function revalidateAdminUser(userId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/audit");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

export async function adminUpdateUserProfile(input: {
  userId: string;
  name: string;
}) {
  const admin = await requireAdmin();
  const parsed = updateProfileSchema.parse(input);

  const before = await db.query.users.findFirst({
    where: eq(users.id, parsed.userId),
    columns: { id: true, name: true },
  });
  if (!before) throw new Error("USER_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ name: parsed.name, updatedAt: new Date() })
      .where(eq(users.id, parsed.userId));
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "user.update_profile",
        entityType: "user",
        entityId: parsed.userId,
        targetUserId: parsed.userId,
        meta: sanitizeAdminMeta({
          before: { name: before.name },
          after: { name: parsed.name },
        }),
      },
      tx,
    );
  });

  revalidateAdminUser(parsed.userId);
  return { ok: true as const };
}

export async function adminSetUserRole(input: {
  userId: string;
  role: "USER" | "ADMIN";
}) {
  const admin = await requireAdmin();
  const parsed = roleSchema.parse(input);

  if (parsed.userId === admin.id && parsed.role !== "ADMIN") {
    throw new Error("CANNOT_DEMOTE_SELF");
  }

  const before = await db.query.users.findFirst({
    where: eq(users.id, parsed.userId),
    columns: { id: true, role: true, suspendedAt: true },
  });
  if (!before) throw new Error("USER_NOT_FOUND");
  if (before.role === parsed.role) return { ok: true as const };

  await db.transaction(async (tx) => {
    if (before.role === "ADMIN" && parsed.role === "USER") {
      await assertNotLastActiveAdmin(parsed.userId, tx);
    }
    await tx
      .update(users)
      .set({ role: parsed.role, updatedAt: new Date() })
      .where(eq(users.id, parsed.userId));
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: parsed.role === "ADMIN" ? "role_grant" : "role_revoke",
        entityType: "user",
        entityId: parsed.userId,
        targetUserId: parsed.userId,
        meta: sanitizeAdminMeta({
          before: { role: before.role },
          after: { role: parsed.role },
        }),
      },
      tx,
    );
  });

  revalidateAdminUser(parsed.userId);
  return { ok: true as const };
}

export async function adminSetUserSuspended(input: {
  userId: string;
  suspended: boolean;
}) {
  const admin = await requireAdmin();
  const userId = z.string().uuid().parse(input.userId);
  const suspended = Boolean(input.suspended);

  if (userId === admin.id) {
    throw new Error("CANNOT_SUSPEND_SELF");
  }

  const before = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true, suspendedAt: true },
  });
  if (!before) throw new Error("USER_NOT_FOUND");

  const already = Boolean(before.suspendedAt) === suspended;
  if (already) return { ok: true as const };

  const nextSuspendedAt = suspended ? new Date() : null;

  await db.transaction(async (tx) => {
    if (suspended && before.role === "ADMIN") {
      await assertNotLastActiveAdmin(userId, tx);
    }
    await tx
      .update(users)
      .set({ suspendedAt: nextSuspendedAt, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: suspended ? "account_suspend" : "account_restore",
        entityType: "user",
        entityId: userId,
        targetUserId: userId,
        meta: sanitizeAdminMeta({
          before: { suspendedAt: before.suspendedAt?.toISOString() ?? null },
          after: { suspendedAt: nextSuspendedAt?.toISOString() ?? null },
        }),
      },
      tx,
    );
  });

  revalidateAdminUser(userId);
  return { ok: true as const };
}

/**
 * Deletes the account row (cascade learning data via FKs) after optional
 * Stripe cancel and media purge. Never returns password hashes.
 */
export async function adminDeleteUser(input: { userId: string }) {
  const admin = await requireAdmin();
  const userId = z.string().uuid().parse(input.userId);

  if (userId === admin.id) {
    throw new Error("CANNOT_DELETE_SELF");
  }

  const before = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      role: true,
      suspendedAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!before) throw new Error("USER_NOT_FOUND");

  // External cleanup outside the DB transaction.
  if (isStripeConfigured() && before.stripeSubscriptionId) {
    try {
      const stripe = getStripeClient();
      await stripe.subscriptions.cancel(before.stripeSubscriptionId);
    } catch (error) {
      console.error("Admin delete: Stripe cancel failed", {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await purgeUserLearningData(userId);
  } catch (error) {
    console.error("Admin delete: purge learning data failed", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  await db.transaction(async (tx) => {
    if (before.role === "ADMIN" && !before.suspendedAt) {
      await assertNotLastActiveAdmin(userId, tx);
    }
    await writeAdminAudit(
      {
        actorUserId: admin.id,
        action: "user.delete",
        entityType: "user",
        entityId: userId,
        targetUserId: null,
        meta: sanitizeAdminMeta({
          email: before.email,
          role: before.role,
        }),
      },
      tx,
    );
    await tx.delete(users).where(eq(users.id, userId));
  });

  revalidateAdminUser();
  return { ok: true as const };
}
