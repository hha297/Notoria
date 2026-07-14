import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? "00000000-0000-4000-8000-000000000001";

const DEMO_EMAIL = "demo@notoria.local";

export async function getCurrentUserId(): Promise<string> {
  const byId = await db.query.users.findFirst({
    where: eq(users.id, DEMO_USER_ID),
  });

  if (byId) {
    return byId.id;
  }

  const byEmail = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });

  if (byEmail) {
    return byEmail.id;
  }

  await db
    .insert(users)
    .values({
      id: DEMO_USER_ID,
      name: "Demo Learner",
      email: DEMO_EMAIL,
      role: "USER",
    })
    .onConflictDoNothing();

  const created = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });

  return created?.id ?? DEMO_USER_ID;
}
