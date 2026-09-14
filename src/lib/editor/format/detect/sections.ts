import { parseSectionHeading } from "@/lib/editor/format/headings";
import { applyEmphasisLabels, paragraphFromLine } from "@/lib/editor/format/nodes";
import {
  EMPHASIS_LABELS,
  SECTION_PATTERNS,
  TITLE_PATTERNS,
  matchSectionPattern,
} from "@/lib/editor/format/patterns";
import { stripBulletPrefix } from "@/lib/editor/format/detect/lists";
import type { Detection, FormatLine } from "@/lib/editor/format/types";

export function detectTitle(lines: FormatLine[], index: number): Detection | null {
  const line = lines[index];
  if (!line) return null;
  const body = stripBulletPrefix(line.text).body;
  if (parseSectionHeading(body)) return null;
  const pattern = matchSectionPattern(body, TITLE_PATTERNS);
  if (!pattern) return null;
  return {
    type: "title",
    confidence: 0.9,
    consumed: 1,
    nodes: [
      {
        type: "heading",
        attrs: { level: pattern.level },
        content: body ? [{ type: "text", text: body }] : undefined,
      },
    ],
  };
}

export function detectSectionHeading(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const line = lines[index];
  if (!line) return null;
  const body = stripBulletPrefix(line.text).body;
  if (parseSectionHeading(body)) return null;
  const pattern = matchSectionPattern(body, SECTION_PATTERNS);
  if (!pattern) return null;
  return {
    type: "section",
    confidence: 0.91,
    consumed: 1,
    nodes: [
      {
        type: "heading",
        attrs: { level: pattern.level },
        content: body ? [{ type: "text", text: body }] : undefined,
      },
    ],
  };
}

const LABEL_RE = new RegExp(`^(${EMPHASIS_LABELS.join("|")})\\s*:`, "iu");

export function detectEmphasisLabel(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const line = lines[index];
  if (!line) return null;
  const body = stripBulletPrefix(line.text).body;
  if (!LABEL_RE.test(body)) return null;
  return {
    type: "emphasis-label",
    confidence: 0.84,
    consumed: 1,
    nodes: [applyEmphasisLabels(body)],
  };
}

export function detectParagraph(
  lines: FormatLine[],
  index: number,
): Detection | null {
  const line = lines[index];
  if (!line) return null;
  const stripped = stripBulletPrefix(line.text);
  return {
    type: "paragraph",
    confidence: 0.1,
    consumed: 1,
    nodes: [
      paragraphFromLine(
        { ...line, text: stripped.body },
        stripped.prefixLength,
      ),
    ],
  };
}
