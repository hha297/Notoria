"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { strongPasswordSchema } from "@/lib/auth/password";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: strongPasswordSchema,
});

/**
 * Creates the user account only. The first learning-language workspace is
 * created later via post-auth onboarding (`completeFirstLanguageOnboarding`).
 */
export async function registerUser(data: z.infer<typeof registerSchema>) {
  let parsed: z.infer<typeof registerSchema>;
  try {
    parsed = registerSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const passwordIssue = error.issues.find((issue) =>
        issue.path.includes("password"),
      );
      if (passwordIssue) {
        throw new Error("PASSWORD_TOO_WEAK");
      }
    }
    throw error;
  }
  const email = parsed.email.toLowerCase().trim();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hash(parsed.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.name.trim(),
      email,
      passwordHash,
      role: "USER",
    })
    .returning();

  return { userId: user.id };
}
