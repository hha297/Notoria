import type { JSONContent } from "@tiptap/react";
import OpenAI from "openai";
import {
  vocabularyNotesFormatResultSchema,
  type VocabularyNotesFormatBlock,
  type VocabularyNotesFormatInput,
  type VocabularyNotesFormatResult,
} from "@/lib/vocabulary/ai-types";
import { WORKPLACE_LANGUAGES, getLanguageByCode } from "@/lib/languages";
import { PARADIGM_AI_RULES } from "@/lib/editor/format/paradigm-ai-rules";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 45_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function notesFormatSystemPrompt(): string {
  return `You restructure vocabulary NOTES for a language-learning app editor.

Goal: turn messy pasted notes into clean, copyable structured content. Convert a paradigm into a table only when the notes themselves contain that paradigm.

Rules:
1. Preserve the learner's information. Do not invent forms that are unsupported by the notes. You MAY normalize morphology; that is analysis, not invention.
2. When notes look like a paradigm for the study language, convert them into ONE table whose headers match that language and the notes. Do not force every language into the same columns or headers.
3. Do not invent a table layout from another language. Use headers and columns that already appear in the notes / study language. If the notes are not a paradigm, keep paragraphs, headings, and lists.
4. Put the category/label in the first column when the notes are a paradigm. Set boldFirstColumn true for label columns.
5. Map each form to its actual grammatical category using linguistic analysis of the study language. Do not fill cells sequentially from top to bottom. Do not trust source labels blindly when a dump is long, repeated, or inconsistent.
6. Keep non-table notes as paragraph / heading / bulletList / orderedList blocks ONLY when that text already exists in the notes.
7. Do NOT invent titles or headings. Especially do NOT add meta headings like "Word – Noun Paradigm", study-language labels as a heading, or decorative titles summarizing the table.
   If the notes are only a paradigm dump, return the table alone (plus any genuine non-table lines that were already present).
8. Do not wrap everything in a table if it is not tabular.
9. Do NOT emit empty paragraphs, placeholder text, or blank filler blocks after tables or headings.
10. Return JSON only:
{
  "blocks": [
    { "type": "heading", "level": 1|2|3, "text": string },
    { "type": "paragraph", "text": string },
    { "type": "bulletList", "items": string[] },
    { "type": "orderedList", "items": string[] },
    {
      "type": "table",
      "headers": string[],
      "rows": string[][],
      "boldFirstColumn": boolean
    }
  ]
}
11. Each table row must have the same number of cells as headers.
12. No markdown. No commentary outside JSON.

${PARADIGM_AI_RULES}`;
}

/**
 * Merge rows that share the same first-column label.
 * Differing later cells become formA/formB (language-agnostic).
 */
export function mergeTableRowsByLabel(rows: string[][]): string[][] {
  const order: string[] = [];
  const merged = new Map<string, string[]>();
  const unlabeled: string[][] = [];

  for (const row of rows) {
    const label = row[0]?.trim() ?? "";
    if (!label) {
      unlabeled.push(row);
      continue;
    }
    const key = label.toLocaleLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      order.push(key);
      merged.set(key, [...row]);
      continue;
    }
    for (let i = 1; i < Math.max(existing.length, row.length); i += 1) {
      existing[i] = mergeCellVariants(existing[i] ?? "", row[i] ?? "");
    }
    // Keep the original casing of the first-seen label.
  }

  return [...order.map((key) => merged.get(key)!), ...unlabeled];
}

function mergeCellVariants(left: string, right: string): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...left.split("/"), ...right.split("/")]) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(value);
  }
  return parts.join("/");
}

/**
 * Ask AI to restructure vocabulary notes into typed blocks (tables when useful).
 */
export async function formatVocabularyNotesWithAi(
  input: VocabularyNotesFormatInput,
): Promise<VocabularyNotesFormatResult> {
  const client = getOpenAIClient();
  const languageHint = input.language
    ? (getLanguageByCode(input.language)?.name ?? input.language)
    : null;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 4_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: notesFormatSystemPrompt() },
      {
        role: "user",
        content: JSON.stringify({
          word: input.word?.trim() || null,
          studyLanguageHint: languageHint,
          notes: input.notes,
          reminder:
            "Merge same-label rows with formA/formB. Strip person/possessive endings. First column = category labels only.",
        }),
      },
    ],
  });

  const parsed = vocabularyNotesFormatResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );
  if (!parsed.success) {
    console.error(
      "vocabulary notes format AI parse failed",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    throw new Error("AI_INVALID_RESPONSE");
  }

  return {
    blocks: sanitizeVocabularyNotesFormatBlocks(parsed.data.blocks, input.word),
  };
}

export function sanitizeVocabularyNotesFormatBlocks(
  blocks: VocabularyNotesFormatBlock[],
  word?: string | null,
): VocabularyNotesFormatBlock[] {
  return blocks
    .map((block) => normalizeBlock(block, { word }))
    .filter((block): block is VocabularyNotesFormatBlock => Boolean(block));
}

function normalizeBlock(
  block: VocabularyNotesFormatBlock,
  context: { word?: string | null },
): VocabularyNotesFormatBlock | null {
  if (block.type === "paragraph") {
    const text = block.text.trim();
    return text ? { type: "paragraph", text } : null;
  }
  if (block.type === "heading") {
    const text = block.text.trim();
    if (!text) return null;
    if (isInventedParadigmHeading(text, context.word)) return null;
    return { type: "heading", level: block.level, text };
  }
  if (block.type === "bulletList" || block.type === "orderedList") {
    const items = block.items.map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? { type: block.type, items } : null;
  }
  if (block.type !== "table") {
    return null;
  }

  const headers = block.headers.map((cell) => cell.trim());
  if (headers.some((cell) => !cell) || headers.length === 0) return null;
  const colCount = headers.length;
  const rows = block.rows
    .map((row) => {
      const cells = row.map((cell) => cell.trim());
      while (cells.length < colCount) cells.push("");
      return cells.slice(0, colCount);
    })
    .filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length === 0) return null;
  return {
    type: "table",
    headers,
    rows: mergeTableRowsByLabel(rows),
    boldFirstColumn: block.boldFirstColumn !== false,
  };
}

/** Drop AI-invented titles like "Word – Noun Paradigm" / lone language labels. */
function isInventedParadigmHeading(text: string, word?: string | null) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;

  if (/\b(noun|adjective|verb|adverb)\s+paradigm\b/i.test(text)) {
    return true;
  }

  // Lone study-language labels the model sometimes prepends.
  const languageLabels = new Set(
    WORKPLACE_LANGUAGES.flatMap((language) => [
      language.name.trim().toLowerCase(),
      language.code.trim().toLowerCase(),
    ]),
  );
  if (languageLabels.has(normalized)) {
    return true;
  }

  const wordKey = word?.trim().toLowerCase();
  if (wordKey && normalized === wordKey) {
    return true;
  }

  return false;
}

function cellParagraph(text: string, bold = false): JSONContent {
  if (!text) return { type: "paragraph" };
  return {
    type: "paragraph",
    content: [
      bold
        ? { type: "text", text, marks: [{ type: "bold" }] }
        : { type: "text", text },
    ],
  };
}

function tableCell(
  text: string,
  opts: { header?: boolean; bold?: boolean } = {},
): JSONContent {
  return {
    type: opts.header ? "tableHeader" : "tableCell",
    content: [cellParagraph(text, opts.bold)],
  };
}

/**
 * Convert AI format blocks into a TipTap notes document (including real tables).
 */
export function notesFormatBlocksToDoc(
  blocks: VocabularyNotesFormatBlock[],
): JSONContent {
  const content: JSONContent[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      content.push(cellParagraph(block.text));
      continue;
    }
    if (block.type === "heading") {
      content.push({
        type: "heading",
        attrs: { level: block.level },
        content: block.text ? [{ type: "text", text: block.text }] : undefined,
      });
      continue;
    }
    if (block.type === "bulletList" || block.type === "orderedList") {
      content.push({
        type: block.type,
        content: block.items.map((item) => ({
          type: "listItem",
          content: [cellParagraph(item)],
        })),
      });
      continue;
    }
    if (block.type !== "table") {
      continue;
    }

    const boldFirst = block.boldFirstColumn !== false;
    const headerRow: JSONContent = {
      type: "tableRow",
      content: block.headers.map((header) =>
        tableCell(header, { header: true, bold: true }),
      ),
    };
    const bodyRows: JSONContent[] = block.rows.map((row) => ({
      type: "tableRow",
      content: row.map((cell, index) =>
        tableCell(cell, { bold: boldFirst && index === 0 }),
      ),
    }));
    content.push({
      type: "table",
      content: [headerRow, ...bodyRows],
    });
  }

  if (content.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  // TipTap needs a trailing empty paragraph after a final table for caret placement,
  // but omit extra empty paragraphs the model sometimes appends mid-document.
  const last = content[content.length - 1];
  if (last?.type === "table") {
    content.push({ type: "paragraph" });
  }

  return { type: "doc", content };
}
