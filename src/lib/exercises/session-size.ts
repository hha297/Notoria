import { shuffleArray } from "@/lib/exercises/utils";

export const SESSION_SIZE_MIN = 20;
export const SESSION_SIZE_MAX = 50;

/** Pick a session length between 20–50 when enough items exist; otherwise use all. */
export function pickSessionSize(available: number): number {
  if (available <= 0) return 0;
  if (available <= SESSION_SIZE_MIN) return available;
  if (available <= SESSION_SIZE_MAX) return available;
  const span = SESSION_SIZE_MAX - SESSION_SIZE_MIN + 1;
  return SESSION_SIZE_MIN + Math.floor(Math.random() * span);
}

export function sampleSessionItems<T>(items: T[]): T[] {
  if (items.length === 0) return [];
  const size = pickSessionSize(items.length);
  return shuffleArray(items).slice(0, size);
}
