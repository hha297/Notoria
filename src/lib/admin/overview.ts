import { count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminAuditEvents,
  aiJobLocks,
  exerciseImports,
  exercises,
  grammarNotes,
  listeningLessons,
  readingPassages,
  speakingSessions,
  studyInboxItems,
  users,
  vocabularyWords,
  workspaceActivityEvents,
  workspaces,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require-admin";

function daysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Overview metrics for /admin.
 * - newUsers7d / newUsers30d: accounts created in the last N UTC calendar days.
 * - activeUsers7d: distinct users with a workspace_activity_events row in 7d
 *   (learning activity, not logins).
 */
export async function getAdminOverviewMetrics() {
  await requireAdmin();

  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    [totalUsers],
    [newUsers7d],
    [newUsers30d],
    [totalWorkspaces],
    [vocabularyCount],
    [theoryCount],
    [writingCount],
    [exerciseCount],
    [listeningCount],
    [readingCount],
    [speakingCount],
    [inboxCount],
    [failedListening],
    [failedImports],
    [runningJobs],
    [recentAudits],
    activeUsers7dRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, since7)),
    db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, since30)),
    db.select({ value: count() }).from(workspaces),
    db.select({ value: count() }).from(vocabularyWords),
    db.select({ value: count() }).from(grammarNotes),
    db
      .select({ value: count() })
      .from(exercises)
      .where(eq(exercises.type, "WRITING")),
    db
      .select({ value: count() })
      .from(exercises)
      .where(sql`${exercises.type} <> 'WRITING'`),
    db.select({ value: count() }).from(listeningLessons),
    db.select({ value: count() }).from(readingPassages),
    db.select({ value: count() }).from(speakingSessions),
    db.select({ value: count() }).from(studyInboxItems),
    db
      .select({ value: count() })
      .from(listeningLessons)
      .where(eq(listeningLessons.status, "FAILED")),
    db
      .select({ value: count() })
      .from(exerciseImports)
      .where(eq(exerciseImports.status, "FAILED")),
    db
      .select({ value: count() })
      .from(aiJobLocks)
      .where(eq(aiJobLocks.status, "running")),
    db
      .select({ value: count() })
      .from(adminAuditEvents)
      .where(gte(adminAuditEvents.createdAt, since7)),
    db
      .select({
        value: sql<number>`count(distinct ${workspaceActivityEvents.userId})`,
      })
      .from(workspaceActivityEvents)
      .where(gte(workspaceActivityEvents.createdAt, since7)),
  ]);

  return {
    ranges: {
      newUsers7d: "Accounts created in the last 7 UTC days",
      newUsers30d: "Accounts created in the last 30 UTC days",
      activeUsers7d:
        "Distinct users with at least one learning activity event in the last 7 UTC days (not logins)",
      recentAudits7d: "Admin audit entries in the last 7 UTC days",
    },
    totals: {
      users: Number(totalUsers.value),
      newUsers7d: Number(newUsers7d.value),
      newUsers30d: Number(newUsers30d.value),
      activeUsers7d: Number(activeUsers7dRows[0]?.value ?? 0),
      workspaces: Number(totalWorkspaces.value),
      vocabulary: Number(vocabularyCount.value),
      theory: Number(theoryCount.value),
      writing: Number(writingCount.value),
      exercises: Number(exerciseCount.value),
      listening: Number(listeningCount.value),
      reading: Number(readingCount.value),
      speaking: Number(speakingCount.value),
      inbox: Number(inboxCount.value),
      failedListening: Number(failedListening.value),
      failedImports: Number(failedImports.value),
      runningJobs: Number(runningJobs.value),
      recentAudits7d: Number(recentAudits.value),
    },
  };
}

export async function getRecentAdminAudit(limit = 8) {
  await requireAdmin();
  return db
    .select({
      id: adminAuditEvents.id,
      actorUserId: adminAuditEvents.actorUserId,
      action: adminAuditEvents.action,
      entityType: adminAuditEvents.entityType,
      entityId: adminAuditEvents.entityId,
      targetUserId: adminAuditEvents.targetUserId,
      success: adminAuditEvents.success,
      createdAt: adminAuditEvents.createdAt,
      actorEmail: users.email,
    })
    .from(adminAuditEvents)
    .leftJoin(users, eq(adminAuditEvents.actorUserId, users.id))
    .orderBy(sql`${adminAuditEvents.createdAt} desc`)
    .limit(limit);
}
