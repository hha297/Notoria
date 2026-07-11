import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-4000-8000-000000000001";

export async function getCurrentUserId(): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, DEMO_USER_ID),
  });

  if (!existing) {
    await db
      .insert(users)
      .values({
        id: DEMO_USER_ID,
        name: "Demo Learner",
        email: "demo@notoria.local",
        role: "USER",
      })
      .onConflictDoNothing({ target: users.id });
  }

  return DEMO_USER_ID;
}
