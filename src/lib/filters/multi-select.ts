export type MultiFilterValue = string[];

/** Empty array means “no constraint” (all values allowed). */
export function isMultiFilterActive(values: MultiFilterValue | null | undefined) {
  return (values?.length ?? 0) > 0;
}

export function toggleMultiFilterValue(
  values: MultiFilterValue,
  value: string,
): MultiFilterValue {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  return [...values, value];
}

/**
 * Normalize legacy single-value / `"all"` filter state into a multi-select array.
 * `"all"`, empty string, null, and undefined → `[]`.
 */
export function normalizeMultiFilterValue(
  value: string | string[] | null | undefined,
): MultiFilterValue {
  if (value == null || value === "" || value === "all") {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item && item !== "all");
  }
  return [value];
}

/** OR match: selected empty → pass; otherwise candidate must be one of selected. */
export function matchesMultiFilter(
  selected: MultiFilterValue,
  candidate: string | null | undefined,
): boolean {
  if (selected.length === 0) return true;
  if (!candidate) return false;
  return selected.includes(candidate);
}

/** OR match against a list of item values (e.g. tags). */
export function matchesMultiFilterAny(
  selected: MultiFilterValue,
  candidates: readonly string[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((value) => candidates.includes(value));
}

export function formatMultiFilterLabel(
  values: MultiFilterValue,
  getLabel: (value: string) => string,
  emptyLabel: string,
  selectedCountLabel: (count: number) => string,
  maxInline = 2,
): string {
  if (values.length === 0) return emptyLabel;
  if (values.length <= maxInline) {
    return values.map(getLabel).join(", ");
  }
  return selectedCountLabel(values.length);
}

export function multiFilterKey(values: MultiFilterValue) {
  return [...values].sort().join(",");
}
