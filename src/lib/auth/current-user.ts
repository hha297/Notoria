import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { incomingRequestId, logAuthEvent } from "@/lib/auth/diagnostics";
import {
  AuthorizationUnavailableError,
} from "@/lib/auth/errors";
import { classifyDependencyError, dependencyCauseCode } from "@/lib/auth/policy";
import { getSession } from "@/lib/auth/session";
import { runBoundedDbOp } from "@/lib/db/run-bounded";
import { withTiming } from "@/lib/perf/dev-timing";

const USER_COLUMNS = {
  id: true,
  name: true,
  email: true,
  role: true,
  suspendedAt: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripeCurrentPeriodEnd: true,
  stripeCancelAtPeriodEnd: true,
  scheduledSubscriptionPlan: true,
  stripeScheduleId: true,
  introOfferUsedAt: true,
  createdAt: true,
} as const;

/**
 * Single request-scoped user row for subscription + pro-access + admin checks.
 * Isolated by React cache() — never shared across requests/users.
 * Always reads the database; never trusts JWT role/suspension alone.
 */
export const getCurrentUserRecord = cache(async () => {
  return withTiming("auth.userRecord", async () => {
    const session = await getSession();
    if (!session?.user?.id) {
      return null;
    }

    const started = Date.now();
    try {
      return await runBoundedDbOp("auth.userRecord", async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: USER_COLUMNS,
        });
        return user ?? null;
      });
    } catch (error) {
      const errorCategory =
        error instanceof AuthorizationUnavailableError
          ? error.category
          : classifyDependencyError(error);
      const causeCode =
        error instanceof AuthorizationUnavailableError
          ? error.causeCode
          : dependencyCauseCode(error);
      logAuthEvent({
        stage: "authorization",
        phase: "check",
        outcome: "unavailable",
        operation: "auth.userRecord",
        durationMs: Date.now() - started,
        errorCategory,
        causeCode,
        requestId: await incomingRequestId(),
      });
      throw error instanceof AuthorizationUnavailableError
        ? error
        : new AuthorizationUnavailableError(errorCategory, causeCode);
    }
  });
});
