import { sql } from "drizzle-orm";

export const AI_JOBS = {
  listeningTranscribe: "listening.transcribe",
  listeningGenerate: "listening.generate",
  exerciseImportExtract: "exercise_import.extract",
  exerciseImportGenerate: "exercise_import.generate",
  readingOcr: "reading.ocr",
  readingGrade: "reading.grade_written",
  speakingTutor: "speaking.tutor",
  speakingSummary: "speaking.summary",
  speakingFinalize: "speaking.finalize",
} as const;

export type JobLockStatus = "running" | "completed" | "failed" | "released";

export type JobLockRecord = {
  operation: string;
  subjectId: string;
  ownerId: string;
  status: JobLockStatus;
  lockedUntil: Date;
  result: unknown;
};

export class JobLockLostError extends Error {
  readonly code = "JOB_LOCK_LOST";

  constructor() {
    super("JOB_LOCK_LOST");
    this.name = "JobLockLostError";
  }
}

type ClaimInput = {
  operation: string;
  subjectId: string;
  ownerId: string;
  now: Date;
  ttlMs: number;
  regenerate: boolean;
};

type OwnerInput = {
  operation: string;
  subjectId: string;
  ownerId: string;
  now: Date;
};

export type JobLockStore = {
  claim(
    input: ClaimInput,
  ): Promise<
    | { acquired: true; lock: JobLockRecord }
    | { acquired: false; lock: JobLockRecord | null }
  >;
  complete(input: OwnerInput & { result: unknown }): Promise<boolean>;
  fail(input: OwnerInput): Promise<boolean>;
  release(input: OwnerInput): Promise<boolean>;
  renew(input: OwnerInput & { ttlMs: number }): Promise<boolean>;
  forceRelease(operation: string, subjectId: string, now: Date): Promise<void>;
  read(operation: string, subjectId: string): Promise<JobLockRecord | null>;
};

const DEFAULT_TTL_MS = 10 * 60 * 1000;

function createOwnerId() {
  const instance =
    process.env.VERCEL_INSTANCE_ID || process.env.HOSTNAME || "local";
  return `${instance}:${crypto.randomUUID()}`;
}

function lockKey(operation: string, subjectId: string) {
  return `${operation}\0${subjectId}`;
}

function canTakeOver(existing: JobLockRecord, now: Date, regenerate: boolean) {
  if (existing.status === "failed" || existing.status === "released") {
    return true;
  }
  if (
    existing.status === "running" &&
    existing.lockedUntil.getTime() <= now.getTime()
  ) {
    return true;
  }
  return regenerate && existing.status === "completed";
}

function cloneLock(row: JobLockRecord): JobLockRecord {
  return {
    ...row,
    lockedUntil: new Date(row.lockedUntil),
  };
}

/** In-memory lock store. Claims are serialized so concurrent callers race safely. */
export class MemoryJobLockStore implements JobLockStore {
  private rows = new Map<string, JobLockRecord>();
  private chain: Promise<void> = Promise.resolve();

  private exclusive<T>(fn: () => T): Promise<T> {
    const run = this.chain.then(() => fn());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  claim(input: ClaimInput) {
    return this.exclusive(() => {
      const key = lockKey(input.operation, input.subjectId);
      const existing = this.rows.get(key);
      const lockedUntil = new Date(input.now.getTime() + input.ttlMs);
      if (!existing || canTakeOver(existing, input.now, input.regenerate)) {
        const row: JobLockRecord = {
          operation: input.operation,
          subjectId: input.subjectId,
          ownerId: input.ownerId,
          status: "running",
          lockedUntil,
          result: null,
        };
        this.rows.set(key, row);
        return { acquired: true as const, lock: cloneLock(row) };
      }
      return { acquired: false as const, lock: cloneLock(existing) };
    });
  }

  complete(input: OwnerInput & { result: unknown }) {
    return this.exclusive(() => {
      const row = this.rows.get(lockKey(input.operation, input.subjectId));
      if (!row || row.ownerId !== input.ownerId || row.status !== "running") {
        return false;
      }
      row.status = "completed";
      row.result = input.result ?? null;
      row.lockedUntil = input.now;
      return true;
    });
  }

  fail(input: OwnerInput) {
    return this.exclusive(() => this.mark(input, "failed"));
  }

  release(input: OwnerInput) {
    return this.exclusive(() => this.mark(input, "released"));
  }

  private mark(input: OwnerInput, status: "failed" | "released") {
    const row = this.rows.get(lockKey(input.operation, input.subjectId));
    if (!row || row.ownerId !== input.ownerId || row.status !== "running") {
      return false;
    }
    row.status = status;
    row.lockedUntil = input.now;
    return true;
  }

  renew(input: OwnerInput & { ttlMs: number }) {
    return this.exclusive(() => {
      const row = this.rows.get(lockKey(input.operation, input.subjectId));
      if (!row || row.ownerId !== input.ownerId || row.status !== "running") {
        return false;
      }
      row.lockedUntil = new Date(input.now.getTime() + input.ttlMs);
      return true;
    });
  }

  forceRelease(operation: string, subjectId: string, now: Date) {
    return this.exclusive(() => {
      const row = this.rows.get(lockKey(operation, subjectId));
      if (!row || row.status !== "running") return;
      row.status = "released";
      row.lockedUntil = now;
    });
  }

  read(operation: string, subjectId: string) {
    return this.exclusive(() => {
      const row = this.rows.get(lockKey(operation, subjectId));
      return row ? cloneLock(row) : null;
    });
  }
}

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function asStatus(value: unknown): JobLockStatus {
  if (
    value === "running" ||
    value === "completed" ||
    value === "failed" ||
    value === "released"
  ) {
    return value;
  }
  return "failed";
}

function recordFromRow(row: Record<string, unknown>): JobLockRecord {
  return {
    operation: String(row.operation ?? ""),
    subjectId: String(row.subject_id ?? ""),
    ownerId: String(row.owner_id ?? ""),
    status: asStatus(row.status),
    lockedUntil: asDate(row.locked_until),
    result: row.result ?? null,
  };
}

async function createPostgresJobLockStore(): Promise<JobLockStore> {
  const { db } = await import("@/db");

  return {
    async claim(input) {
      const claimed = rowsOf(
        await db.execute(sql`
          INSERT INTO ai_job_locks (
            id, operation, subject_id, owner_id, status, locked_until, result, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            ${input.operation},
            ${input.subjectId},
            ${input.ownerId},
            'running',
            ${input.now.toISOString()}::timestamptz + (${input.ttlMs} * interval '1 millisecond'),
            null,
            now(),
            now()
          )
          ON CONFLICT (operation, subject_id)
          DO UPDATE SET
            owner_id = EXCLUDED.owner_id,
            status = 'running',
            locked_until = EXCLUDED.locked_until,
            result = null,
            updated_at = now()
          WHERE ai_job_locks.status IN ('failed', 'released')
            OR (
              ai_job_locks.status = 'running'
              AND ai_job_locks.locked_until <= ${input.now.toISOString()}::timestamptz
            )
            OR (
              ${input.regenerate}
              AND ai_job_locks.status = 'completed'
            )
          RETURNING operation, subject_id, owner_id, status, locked_until, result
        `),
      );
      if (claimed[0]) {
        return { acquired: true, lock: recordFromRow(claimed[0]) };
      }
      const current = rowsOf(
        await db.execute(sql`
          SELECT operation, subject_id, owner_id, status, locked_until, result
          FROM ai_job_locks
          WHERE operation = ${input.operation}
            AND subject_id = ${input.subjectId}
        `),
      );
      return {
        acquired: false,
        lock: current[0] ? recordFromRow(current[0]) : null,
      };
    },

    async complete(input) {
      const updated = rowsOf(
        await db.execute(sql`
          UPDATE ai_job_locks
          SET status = 'completed',
              result = ${JSON.stringify(input.result ?? null)}::jsonb,
              locked_until = ${input.now.toISOString()}::timestamptz,
              updated_at = now()
          WHERE operation = ${input.operation}
            AND subject_id = ${input.subjectId}
            AND owner_id = ${input.ownerId}
            AND status = 'running'
          RETURNING id
        `),
      );
      return updated.length > 0;
    },

    async fail(input) {
      return markPostgres(db, input, "failed");
    },

    async release(input) {
      return markPostgres(db, input, "released");
    },

    async renew(input) {
      const updated = rowsOf(
        await db.execute(sql`
          UPDATE ai_job_locks
          SET locked_until = ${input.now.toISOString()}::timestamptz
                + (${input.ttlMs} * interval '1 millisecond'),
              updated_at = now()
          WHERE operation = ${input.operation}
            AND subject_id = ${input.subjectId}
            AND owner_id = ${input.ownerId}
            AND status = 'running'
          RETURNING id
        `),
      );
      return updated.length > 0;
    },

    async forceRelease(operation, subjectId, now) {
      await db.execute(sql`
        UPDATE ai_job_locks
        SET status = 'released',
            locked_until = ${now.toISOString()}::timestamptz,
            updated_at = now()
        WHERE operation = ${operation}
          AND subject_id = ${subjectId}
          AND status = 'running'
      `);
    },

    async read(operation, subjectId) {
      const current = rowsOf(
        await db.execute(sql`
          SELECT operation, subject_id, owner_id, status, locked_until, result
          FROM ai_job_locks
          WHERE operation = ${operation}
            AND subject_id = ${subjectId}
        `),
      );
      return current[0] ? recordFromRow(current[0]) : null;
    },
  };
}

async function markPostgres(
  db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  input: OwnerInput,
  status: "failed" | "released",
) {
  const updated = rowsOf(
    await db.execute(sql`
      UPDATE ai_job_locks
      SET status = ${status},
          locked_until = ${input.now.toISOString()}::timestamptz,
          updated_at = now()
      WHERE operation = ${input.operation}
        AND subject_id = ${input.subjectId}
        AND owner_id = ${input.ownerId}
        AND status = 'running'
      RETURNING id
    `),
  );
  return updated.length > 0;
}

let defaultStore: Promise<JobLockStore> | null = null;

async function resolveStore(store?: JobLockStore) {
  if (store) return store;
  defaultStore ??= createPostgresJobLockStore();
  return defaultStore;
}

export function jobLockIsActive(lock: JobLockRecord | null, now = new Date()) {
  return Boolean(
    lock &&
      lock.status === "running" &&
      lock.lockedUntil.getTime() > now.getTime(),
  );
}

export async function readJobLock(
  operation: string,
  subjectId: string,
  store?: JobLockStore,
) {
  const resolved = await resolveStore(store);
  return resolved.read(operation, subjectId);
}

export async function forceReleaseJobLock(
  operation: string,
  subjectId: string,
  store?: JobLockStore,
) {
  const resolved = await resolveStore(store);
  await resolved.forceRelease(operation, subjectId, new Date());
}

export async function releaseJobLock(input: {
  operation: string;
  subjectId: string;
  ownerId: string;
  store?: JobLockStore;
}) {
  const resolved = await resolveStore(input.store);
  return resolved.release({
    operation: input.operation,
    subjectId: input.subjectId,
    ownerId: input.ownerId,
    now: new Date(),
  });
}

async function ownsLock(
  store: JobLockStore,
  operation: string,
  subjectId: string,
  ownerId: string,
) {
  const row = await store.read(operation, subjectId);
  return Boolean(
    row &&
      row.status === "running" &&
      row.ownerId === ownerId &&
      row.lockedUntil.getTime() > Date.now(),
  );
}

export type ExclusiveJobResult<T> =
  | { status: "completed"; duplicate: boolean; result: T }
  | { status: "in_progress"; duplicate: true };

export async function runExclusiveJob<T>(input: {
  operation: string;
  subjectId: string;
  ttlMs?: number;
  regenerate?: boolean;
  heartbeat?: boolean;
  now?: Date;
  store?: JobLockStore;
  ownerId?: string;
  run: (ctx: {
    ownerId: string;
    stillOwner: () => Promise<boolean>;
  }) => Promise<T>;
}): Promise<ExclusiveJobResult<T>> {
  const store = await resolveStore(input.store);
  const now = input.now ?? new Date();
  const ownerId = input.ownerId ?? createOwnerId();
  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const claimed = await store.claim({
    operation: input.operation,
    subjectId: input.subjectId,
    ownerId,
    now,
    ttlMs,
    regenerate: input.regenerate === true,
  });

  if (!claimed.acquired) {
    if (claimed.lock?.status === "completed") {
      return {
        status: "completed",
        duplicate: true,
        result: claimed.lock.result as T,
      };
    }
    return { status: "in_progress", duplicate: true };
  }

  const heartbeat =
    input.heartbeat === false
      ? 0
      : Math.min(30_000, Math.max(1_000, Math.floor(ttlMs / 3)));
  const timer =
    heartbeat > 0
      ? setInterval(() => {
          void store.renew({
            operation: input.operation,
            subjectId: input.subjectId,
            ownerId,
            ttlMs,
            now: new Date(),
          });
        }, heartbeat)
      : null;
  timer?.unref?.();

  try {
    const result = await input.run({
      ownerId,
      stillOwner: () => ownsLock(store, input.operation, input.subjectId, ownerId),
    });
    const saved = await store.complete({
      operation: input.operation,
      subjectId: input.subjectId,
      ownerId,
      now: new Date(),
      result,
    });
    if (!saved) return { status: "in_progress", duplicate: true };
    return { status: "completed", duplicate: false, result };
  } catch (error) {
    if (error instanceof JobLockLostError) {
      return { status: "in_progress", duplicate: true };
    }
    await store.fail({
      operation: input.operation,
      subjectId: input.subjectId,
      ownerId,
      now: new Date(),
    });
    throw error;
  } finally {
    if (timer) clearInterval(timer);
  }
}

export async function acquireJobLock(input: {
  operation: string;
  subjectId: string;
  ttlMs: number;
  regenerate?: boolean;
  store?: JobLockStore;
  now?: Date;
}) {
  const store = await resolveStore(input.store);
  const ownerId = createOwnerId();
  const now = input.now ?? new Date();
  const claimed = await store.claim({
    operation: input.operation,
    subjectId: input.subjectId,
    ownerId,
    now,
    ttlMs: input.ttlMs,
    regenerate: input.regenerate === true,
  });
  if (!claimed.acquired) {
    if (claimed.lock?.status === "completed") {
      return {
        ok: false as const,
        state: "completed" as const,
        result: claimed.lock.result,
      };
    }
    return { ok: false as const, state: "in_progress" as const, result: null };
  }

  return {
    ok: true as const,
    ownerId,
    renew: () =>
      store.renew({
        operation: input.operation,
        subjectId: input.subjectId,
        ownerId,
        ttlMs: input.ttlMs,
        now: new Date(),
      }),
    release: () =>
      store.release({
        operation: input.operation,
        subjectId: input.subjectId,
        ownerId,
        now: new Date(),
      }),
  };
}
