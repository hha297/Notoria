/**
 * Parse outline numbering from the line itself.
 * Depth = number of numeric segments (`1` → 1, `2.1` → 2, `1.3.10` → 3).
 */
export function parseSectionHeading(text: string): {
  depth: number;
  number: string;
  title: string;
} | null {
  const trimmed = text.trim();

  const withSectionDot = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+(.+)$/u);
  if (withSectionDot?.[1] && withSectionDot[2]) {
    return {
      number: withSectionDot[1],
      depth: withSectionDot[1].split(".").filter(Boolean).length,
      title: withSectionDot[2],
    };
  }

  const multiNoTrailingDot = trimmed.match(/^(\d+\.\d+(?:\.\d+)*)\s+(.+)$/u);
  if (multiNoTrailingDot?.[1] && multiNoTrailingDot[2]) {
    return {
      number: multiNoTrailingDot[1],
      depth: multiNoTrailingDot[1].split(".").filter(Boolean).length,
      title: multiNoTrailingDot[2],
    };
  }

  return null;
}

export function hierarchicalHeadingDepth(text: string): number | null {
  return parseSectionHeading(text)?.depth ?? null;
}
