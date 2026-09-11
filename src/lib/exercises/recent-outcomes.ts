/** Per-word result from the section that just finished (in-memory only). */
export type SectionWordOutcome = {
  wordId: string;
  correct: boolean;
  /** Sentence / item key used for soft sentence-dedup on retry. */
  itemKey?: string;
};

/** Soft preferences applied when building the next exercise section. */
export type RecentSectionPreferences = {
  softAvoidWordIds: string[];
  softPreferWordIds: string[];
  softAvoidItemKeys: string[];
};

export const EMPTY_RECENT_PREFERENCES: RecentSectionPreferences = {
  softAvoidWordIds: [],
  softPreferWordIds: [],
  softAvoidItemKeys: [],
};

export function preferencesFromOutcomes(
  outcomes: SectionWordOutcome[],
): RecentSectionPreferences {
  const softAvoidWordIds: string[] = [];
  const softPreferWordIds: string[] = [];
  const softAvoidItemKeys: string[] = [];

  for (const outcome of outcomes) {
    if (outcome.correct) softAvoidWordIds.push(outcome.wordId);
    else softPreferWordIds.push(outcome.wordId);
    if (outcome.itemKey?.trim()) softAvoidItemKeys.push(outcome.itemKey.trim());
  }

  return {
    softAvoidWordIds: [...new Set(softAvoidWordIds)],
    softPreferWordIds: [...new Set(softPreferWordIds)],
    softAvoidItemKeys: [...new Set(softAvoidItemKeys)],
  };
}

/** Upsert outcome by wordId (last answer for that word wins). */
export function upsertSectionOutcome(
  outcomes: SectionWordOutcome[],
  next: SectionWordOutcome,
): SectionWordOutcome[] {
  const index = outcomes.findIndex((item) => item.wordId === next.wordId);
  if (index < 0) return [...outcomes, next];
  const copy = [...outcomes];
  copy[index] = next;
  return copy;
}
