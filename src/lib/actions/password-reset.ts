"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TOKEN_TTL_MS,
  passwordResetExpiresAt,
} from "@/lib/auth/password-reset-token";
import {
  buildPasswordResetUrl,
  isResendConfigured,
  sendPasswordResetEmail,
} from "@/lib/email/password-reset";

const GENERIC_SUCCESS = "RESET_EMAIL_SENT" as const;

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

const resetSchema = z
  .object({
    token: z.string().trim().min(20).max(256),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "PASSWORD_MISMATCH",
    path: ["confirmPassword"],
  });

/**
 * Always returns the same success shape whether or not the email exists.
 * Never reveals account presence to the client.
 */
export async function requestPasswordReset(data: z.infer<typeof requestSchema>) {
  const parsed = requestSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("INVALID_EMAIL");
  }

  const email = parsed.data.email.toLowerCase();
  const rate = consumeRateLimit({
    key: `password-reset:${email}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    // Still return generic success to avoid account enumeration via rate tips.
    return { ok: true as const, code: GENERIC_SUCCESS };
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
      },
    });

    // Unknown email or OAuth-only account (no password): same response, no email.
    if (!user?.passwordHash) {
      return { ok: true as const, code: GENERIC_SUCCESS };
    }

    if (!isResendConfigured()) {
      console.error("Password reset skipped: Resend is not configured");
      return { ok: true as const, code: GENERIC_SUCCESS };
    }

    const rawToken = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = passwordResetExpiresAt();

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = buildPasswordResetUrl(rawToken);
    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresInMinutes: Math.round(PASSWORD_RESET_TOKEN_TTL_MS / 60000),
    });
  } catch (error) {
    console.error("Password reset request failed", {
      reason: error instanceof Error ? error.name : "UNKNOWN",
    });
  }

  return { ok: true as const, code: GENERIC_SUCCESS };
}

export async function resetPassword(data: z.infer<typeof resetSchema>) {
  const parsed = resetSchema.safeParse(data);

  if (!parsed.success) {
    const mismatch = parsed.error.issues.some(
      (issue) => issue.message === "PASSWORD_MISMATCH",
    );
    if (mismatch) {
      throw new Error("PASSWORD_MISMATCH");
    }
    const passwordIssue = parsed.error.issues.some((issue) =>
      issue.path.includes("password"),
    );
    if (passwordIssue) {
      throw new Error("INVALID_PASSWORD");
    }
    throw new Error("INVALID_TOKEN");
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);

  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
    with: {
      user: {
        columns: {
          id: true,
          passwordHash: true,
        },
      },
    },
  });

  if (!tokenRow || tokenRow.usedAt || tokenRow.expiresAt.getTime() <= Date.now()) {
    throw new Error("INVALID_TOKEN");
  }

  if (!tokenRow.user.passwordHash) {
    throw new Error("INVALID_TOKEN");
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const usedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        updatedAt: usedAt,
      })
      .where(eq(users.id, tokenRow.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(eq(passwordResetTokens.id, tokenRow.id));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt })
      .where(
        and(
          eq(passwordResetTokens.userId, tokenRow.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  });

  return { ok: true as const };
}
