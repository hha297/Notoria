/** Max meanings marked primary for exercises (common / learner-focused). */
export const MAX_PRIMARY_MEANINGS = 5;

export function countPrimaryMeanings(
  meanings: Array<{ isPrimary?: boolean }>,
): number {
  return meanings.filter((item) => item.isPrimary).length;
}
