import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  quotaResetAt,
  usageDateUtc,
  type QuotaFeatureId,
} from "@/lib/billing/plans";

export type UsageReserveResult =
  | { ok: true; reservationId: string; reused: boolean }
  | { ok: false; used: number; limit: number; resetAt: string };

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
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

/**
 * Increments today's counter only when it is still below the limit.
 * The WHERE clause is evaluated as part of the upsert, so two concurrent
 * requests cannot both consume the last remaining unit.
 */
async function incrementIfAllowed(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    userId: string;
    feature: string;
    usageDate: string;
    limit: number;
  },
) {
  const updated = rowsOf(
    await tx.execute(sql`
      INSERT INTO ai_usage (
        id, user_id, feature, usage_date, count, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${input.userId},
        ${input.feature},
        ${input.usageDate}::date,
        1,
        now(),
        now()
      )
      ON CONFLICT (user_id, feature, usage_date)
      DO UPDATE SET
        count = ai_usage.count + 1,
        updated_at = now()
      WHERE ai_usage.count < ${input.limit}
      RETURNING count
    `),
  );
  const count = updated[0]?.count;
  return typeof count === "number" ? count : Number(count);
}

export async function reserveUsage(input: {
  userId: string;
  feature: QuotaFeatureId;
  limit: number;
  subjectId?: string | null;
  now?: Date;
}): Promise<UsageReserveResult> {
  const now = input.now ?? new Date();
  const usageDate = usageDateUtc(now);
  const resetAt = quotaResetAt(now);
  const subjectId = input.subjectId?.trim() || null;

  return db.transaction(async (tx) => {
    if (subjectId) {
      const inserted = rowsOf(
        await tx.execute(sql`
          INSERT INTO ai_usage_reservations (
            id, user_id, feature, usage_date, subject_id, status, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            ${input.userId},
            ${input.feature},
            ${usageDate}::date,
            ${subjectId},
            'reserved',
            now(),
            now()
          )
          ON CONFLICT (user_id, feature, usage_date, subject_id)
          WHERE subject_id IS NOT NULL
          DO NOTHING
          RETURNING id
        `),
      );

      if (inserted.length > 0) {
        const reservationId = String(inserted[0]?.id ?? "");
        const count = await incrementIfAllowed(tx, {
          userId: input.userId,
          feature: input.feature,
          usageDate,
          limit: input.limit,
        });
        if (!Number.isFinite(count)) {
          await tx.execute(sql`
            DELETE FROM ai_usage_reservations WHERE id = ${reservationId}
          `);
          return {
            ok: false as const,
            used: input.limit,
            limit: input.limit,
            resetAt,
          };
        }
        return { ok: true as const, reservationId, reused: false };
      }

      const existing = rowsOf(
        await tx.execute(sql`
          SELECT id, status
          FROM ai_usage_reservations
          WHERE user_id = ${input.userId}
            AND feature = ${input.feature}
            AND usage_date = ${usageDate}::date
            AND subject_id = ${subjectId}
          FOR UPDATE
        `),
      );
      const row = existing[0];
      const status = row ? String(row.status) : "";
      const reservationId = row ? String(row.id) : "";
      if (
        reservationId &&
        (status === "reserved" || status === "finalized")
      ) {
        return { ok: true as const, reservationId, reused: true };
      }
      if (status === "refunded" && reservationId) {
        const count = await incrementIfAllowed(tx, {
          userId: input.userId,
          feature: input.feature,
          usageDate,
          limit: input.limit,
        });
        if (!Number.isFinite(count)) {
          return {
            ok: false as const,
            used: input.limit,
            limit: input.limit,
            resetAt,
          };
        }
        await tx.execute(sql`
          UPDATE ai_usage_reservations
          SET status = 'reserved', updated_at = now()
          WHERE id = ${reservationId}
        `);
        return { ok: true as const, reservationId, reused: false };
      }

      return {
        ok: false as const,
        used: input.limit,
        limit: input.limit,
        resetAt,
      };
    }

    const count = await incrementIfAllowed(tx, {
      userId: input.userId,
      feature: input.feature,
      usageDate,
      limit: input.limit,
    });
    if (!Number.isFinite(count)) {
      return {
        ok: false as const,
        used: input.limit,
        limit: input.limit,
        resetAt,
      };
    }

    const created = rowsOf(
      await tx.execute(sql`
        INSERT INTO ai_usage_reservations (
          id, user_id, feature, usage_date, subject_id, status, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(),
          ${input.userId},
          ${input.feature},
          ${usageDate}::date,
          null,
          'reserved',
          now(),
          now()
        )
        RETURNING id
      `),
    );
    return {
      ok: true as const,
      reservationId: String(created[0]?.id ?? ""),
      reused: false,
    };
  });
}

export async function finalizeUsageReservation(reservationId: string | null) {
  if (!reservationId) return;
  await db.execute(sql`
    UPDATE ai_usage_reservations
    SET status = 'finalized', updated_at = now()
    WHERE id = ${reservationId} AND status = 'reserved'
  `);
}

export async function refundUsageReservation(reservationId: string | null) {
  if (!reservationId) return;
  await db.transaction(async (tx) => {
    const updated = rowsOf(
      await tx.execute(sql`
        UPDATE ai_usage_reservations
        SET status = 'refunded', updated_at = now()
        WHERE id = ${reservationId} AND status = 'reserved'
        RETURNING user_id, feature, usage_date
      `),
    );
    const row = updated[0];
    if (!row) return;
    await tx.execute(sql`
      UPDATE ai_usage
      SET count = count - 1, updated_at = now()
      WHERE user_id = ${String(row.user_id)}
        AND feature = ${String(row.feature)}
        AND usage_date = ${String(row.usage_date)}::date
        AND count > 0
    `);
  });
}

export async function readUsageCounts(userId: string, usageDate: string) {
  const result = rowsOf(
    await db.execute(sql`
      SELECT feature, count
      FROM ai_usage
      WHERE user_id = ${userId}
        AND usage_date = ${usageDate}::date
    `),
  );
  const counts = new Map<string, number>();
  for (const row of result) {
    counts.set(String(row.feature), Number(row.count ?? 0));
  }
  return counts;
}
