/**
 * In-memory ledger used by tests. It applies the same rules as the database:
 * a slot is taken only when the current count is still under the limit, and a
 * reservation can be refunded only once.
 *
 * Production enforcement is the conditional SQL upsert in usage.ts. This ledger
 * stays synchronous between the read and the write so two overlapping calls
 * cannot share one remaining slot.
 */

export type ReservationStatus = "reserved" | "finalized" | "refunded";

type Reservation = {
  id: string;
  userId: string;
  feature: string;
  usageDate: string;
  subjectId: string | null;
  status: ReservationStatus;
};

export type ReserveResult =
  | { ok: true; reservationId: string; reused: boolean; count: number }
  | { ok: false; used: number };

export class UsageLedger {
  private counts = new Map<string, number>();
  private reservations = new Map<string, Reservation>();
  private sequence = 0;

  private countKey(userId: string, feature: string, usageDate: string) {
    return `${userId}\0${feature}\0${usageDate}`;
  }

  getCount(userId: string, feature: string, usageDate: string) {
    return this.counts.get(this.countKey(userId, feature, usageDate)) ?? 0;
  }

  reserve(input: {
    userId: string;
    feature: string;
    usageDate: string;
    limit: number;
    subjectId?: string | null;
  }): ReserveResult {
    const subjectId = input.subjectId ?? null;
    if (subjectId) {
      const existing = [...this.reservations.values()].find(
        (row) =>
          row.userId === input.userId &&
          row.feature === input.feature &&
          row.usageDate === input.usageDate &&
          row.subjectId === subjectId,
      );
      if (existing && (existing.status === "reserved" || existing.status === "finalized")) {
        return {
          ok: true,
          reservationId: existing.id,
          reused: true,
          count: this.getCount(input.userId, input.feature, input.usageDate),
        };
      }
    }

    const key = this.countKey(input.userId, input.feature, input.usageDate);
    const used = this.counts.get(key) ?? 0;
    if (used >= input.limit) {
      return { ok: false, used };
    }

    const next = used + 1;
    this.counts.set(key, next);

    if (subjectId) {
      const existing = [...this.reservations.values()].find(
        (row) =>
          row.userId === input.userId &&
          row.feature === input.feature &&
          row.usageDate === input.usageDate &&
          row.subjectId === subjectId,
      );
      if (existing) {
        existing.status = "reserved";
        return { ok: true, reservationId: existing.id, reused: false, count: next };
      }
    }

    const id = `res_${++this.sequence}`;
    this.reservations.set(id, {
      id,
      userId: input.userId,
      feature: input.feature,
      usageDate: input.usageDate,
      subjectId,
      status: "reserved",
    });
    return { ok: true, reservationId: id, reused: false, count: next };
  }

  finalize(reservationId: string) {
    const row = this.reservations.get(reservationId);
    if (!row || row.status !== "reserved") return false;
    row.status = "finalized";
    return true;
  }

  refund(reservationId: string) {
    const row = this.reservations.get(reservationId);
    if (!row || row.status !== "reserved") return false;
    row.status = "refunded";
    const key = this.countKey(row.userId, row.feature, row.usageDate);
    const used = this.counts.get(key) ?? 0;
    this.counts.set(key, Math.max(0, used - 1));
    return true;
  }
}
