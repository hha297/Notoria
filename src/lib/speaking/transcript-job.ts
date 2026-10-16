import {
  AI_JOBS,
  runExclusiveJob,
  type JobLockStore,
} from "@/lib/ai/job-lock";
import { speakingTranscriptPlan } from "@/lib/speaking/job-policy";

export async function saveSpeakingTranscriptOnce<T>(input: {
  hasSummary: boolean;
  incomingText: string;
  subjectId: string;
  store?: JobLockStore;
  summarize: (ctx: { stillOwner: () => Promise<boolean> }) => Promise<T>;
}) {
  const plan = speakingTranscriptPlan({
    hasSummary: input.hasSummary,
    incomingText: input.incomingText,
  });
  if (plan === "keep") return { action: "kept" as const };
  if (plan === "complete_empty") return { action: "empty" as const };

  const outcome = await runExclusiveJob({
    operation: AI_JOBS.speakingSummary,
    subjectId: input.subjectId,
    ttlMs: 3 * 60 * 1000,
    store: input.store,
    heartbeat: input.store ? false : true,
    run: (ctx) => input.summarize(ctx),
  });

  if (outcome.status === "in_progress") {
    return { action: "in_progress" as const };
  }
  return {
    action: outcome.duplicate ? ("kept" as const) : ("summarized" as const),
    result: outcome.result,
  };
}
