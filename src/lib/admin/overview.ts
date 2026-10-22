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

function utcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fillDailySeries(
  since: Date,
  days: number,
  rows: Array<{ day: string; value: number }>,
) {
  const byDay = new Map(
    rows.map((row) => [row.day.slice(0, 10), Number(row.value)]),
  );
  const series: Array<{ day: string; value: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = utcDayKey(d);
    series.push({ day: key, value: byDay.get(key) ?? 0 });
  }
  return series;
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
  const since14 = daysAgo(13);
  const since30 = daysAgo(30);

  const [
    [totalUsers],
    [adminUsers],
    [testerUsers],
    [suspendedUsers],
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
    signupRows,
    activityRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "ADMIN")),
    db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, "TESTER")),
    db
      .select({ value: count() })
      .from(users)
      .where(sql`${users.suspendedAt} is not null`),
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
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${users.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        value: count(),
      })
      .from(users)
      .where(gte(users.createdAt, since14))
      .groupBy(
        sql`date_trunc('day', ${users.createdAt} at time zone 'UTC')`,
      )
      .orderBy(
        sql`date_trunc('day', ${users.createdAt} at time zone 'UTC')`,
      ),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${workspaceActivityEvents.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`,
        value: sql<number>`count(distinct ${workspaceActivityEvents.userId})`,
      })
      .from(workspaceActivityEvents)
      .where(gte(workspaceActivityEvents.createdAt, since14))
      .groupBy(
        sql`date_trunc('day', ${workspaceActivityEvents.createdAt} at time zone 'UTC')`,
      )
      .orderBy(
        sql`date_trunc('day', ${workspaceActivityEvents.createdAt} at time zone 'UTC')`,
      ),
  ]);

  const totals = {
    users: Number(totalUsers.value),
    admins: Number(adminUsers.value),
    testers: Number(testerUsers.value),
    suspended: Number(suspendedUsers.value),
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
  };

  const contentTotal =
    totals.vocabulary +
    totals.theory +
    totals.writing +
    totals.exercises +
    totals.listening +
    totals.reading +
    totals.speaking +
    totals.inbox;

  const regularUsers = Math.max(
    0,
    totals.users - totals.admins - totals.testers,
  );

  return {
    ranges: {
      newUsers7d: "Accounts created in the last 7 UTC days",
      newUsers30d: "Accounts created in the last 30 UTC days",
      activeUsers7d:
        "Distinct users with at least one learning activity event in the last 7 UTC days (not logins)",
      recentAudits7d: "Admin audit entries in the last 7 UTC days",
    },
    totals: {
      ...totals,
      contentTotal,
    },
    series: {
      signups14d: fillDailySeries(
        since14,
        14,
        signupRows.map((row) => ({
          day: String(row.day),
          value: Number(row.value),
        })),
      ),
      active14d: fillDailySeries(
        since14,
        14,
        activityRows.map((row) => ({
          day: String(row.day),
          value: Number(row.value),
        })),
      ),
    },
    breakdowns: {
      roles: [
        { key: "user", value: regularUsers },
        { key: "tester", value: totals.testers },
        { key: "admin", value: totals.admins },
      ],
      content: [
        { key: "vocabulary", value: totals.vocabulary },
        { key: "theory", value: totals.theory },
        { key: "writing", value: totals.writing },
        { key: "exercises", value: totals.exercises },
        { key: "listening", value: totals.listening },
        { key: "reading", value: totals.reading },
        { key: "speaking", value: totals.speaking },
        { key: "inbox", value: totals.inbox },
      ],
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
