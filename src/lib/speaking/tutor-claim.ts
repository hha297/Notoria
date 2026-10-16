import { AI_JOBS, acquireJobLock, type JobLockStore } from "@/lib/ai/job-lock";
import { tutorConnectPlan } from "@/lib/speaking/job-policy";

const TUTOR_LOCK_TTL_MS = 90_000;

export async function claimSpeakingTutor(input: {
  status: string;
  localConnected: boolean;
  sessionId: string;
  startedAt?: Date | string | null;
  store?: JobLockStore;
  now?: Date;
  ttlMs?: number;
}) {
  const plan = tutorConnectPlan({
    status: input.status,
    localConnected: input.localConnected,
    startedAt: input.startedAt,
    now: input.now,
  });
  if (plan === "reject") return { action: "reject" as const };
  if (plan === "already_connected") {
    return { action: "already_connected" as const };
  }

  const acquired = await acquireJobLock({
    operation: AI_JOBS.speakingTutor,
    subjectId: input.sessionId,
    ttlMs: input.ttlMs ?? TUTOR_LOCK_TTL_MS,
    store: input.store,
    now: input.now,
  });
  if (!acquired.ok) return { action: "already_connected" as const };

  return {
    action: "connect" as const,
    ownerId: acquired.ownerId,
    renew: acquired.renew,
    release: acquired.release,
  };
}
