"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { DEFAULT_WORKPLACE_LANGUAGE } from "@/lib/languages";
import { resolveWorkspaceName } from "@/lib/workspace-names";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.parse(data);
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

  const [workspace] = await db
    .insert(workspaces)
    .values({
      userId: user.id,
      language: DEFAULT_WORKPLACE_LANGUAGE,
      name: resolveWorkspaceName(undefined, DEFAULT_WORKPLACE_LANGUAGE),
    })
    .returning();

  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspace.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return { userId: user.id };
}
