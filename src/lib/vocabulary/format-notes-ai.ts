import type { JSONContent } from "@tiptap/react";
import OpenAI from "openai";
import {
  vocabularyNotesFormatResultSchema,
  type VocabularyNotesFormatBlock,
  type VocabularyNotesFormatInput,
  type VocabularyNotesFormatResult,
} from "@/lib/vocabulary/ai-types";
import { getLanguageByCode } from "@/lib/languages";

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

const NOTES_FORMAT_PROMPT = `You restructure vocabulary NOTES for a language-learning app editor.

Goal: turn messy pasted notes into clean, copyable structured content — especially inflection / conjugation / case paradigms as TABLES.

Rules:
1. Preserve the learner's information. Do not invent forms that are not in the notes.
2. When notes look like a paradigm (cases, singular/plural, tenses, persons), convert them into ONE table.
3. Preferred table headers for Finnish noun cases (when applicable):
   - Sija | Yksikkö | Monikko
   Or the equivalent labels already present in the notes / study language.
4. Put the case/label in the first column. Set boldFirstColumn true for label columns.
5. CRITICAL — pair singular and plural of the SAME case on ONE row:
   - Row label = the case name only (Nominatiivi, Genetiivi, Partitiivi, Inessiivi, …).
   - Yksikkö column = singular form of that case.
   - Monikko column = plural form of that case.
   - NEVER create separate rows like "Monikon genetiivi" or "Monikon partitiivi" when headers are Sija|Yksikkö|Monikko.
   - NEVER put a singular form into the Monikko column.
   - NEVER leave Yksikkö empty when the notes contain the singular form.
   Example (Finnish "ilma"):
   | Sija | Yksikkö | Monikko |
   | Genetiivi | ilman | ilmojen |
   | Partitiivi | ilmaa | ilmoja |
   | Inessiivi | ilmassa | ilmoissa |
   Wrong (do NOT do this):
   | Genetiivi |  | ilman |
   | Monikon genetiivi |  | ilmojen |
6. Raw dumps often interleave labels and forms across lines — regroup by case using rule 5.
7. Keep non-table notes as paragraph / heading / bulletList / orderedList blocks ONLY when that text already exists in the notes.
8. Do NOT invent titles or headings. Especially do NOT add meta headings like:
   - "Word – Noun Paradigm"
   - "Ilma – Noun Paradigm"
   - "Rauhallinen – Adjective Paradigm"
   - study-language labels such as "Suomi" / "Finnish" as a heading
   - any decorative title summarizing the table
   If the notes are only a paradigm dump, return the table alone (plus any genuine non-table lines that were already present).
9. Do not wrap everything in a table if it is not tabular.
10. Do NOT emit empty paragraphs, placeholder text, or blank filler blocks after tables or headings.
11. Return JSON only:
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
12. Each table row must have the same number of cells as headers.
13. No markdown. No commentary outside JSON.`;

/**
 * Ask AI to restructure vocabulary notes into typed blocks (tables when useful).
 */
export async function formatVocabularyNotesWithAi(
  input: VocabularyNotesFormatInput,
): Promise<VocabularyNotesFormatResult> {
  const client = getOpenAIClient();
  const languageHint = input.language
    ? getLanguageByCode(input.language)?.name ?? input.language
    : null;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.15,
    max_tokens: 4_000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: NOTES_FORMAT_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          word: input.word?.trim() || null,
          studyLanguageHint: languageHint,
          notes: input.notes,
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
    rows,
    boldFirstColumn: block.boldFirstColumn !== false,
  };
}

/** Drop AI-invented titles like "Rauhallinen – Noun Paradigm" / lone language labels. */
function isInventedParadigmHeading(text: string, word?: string | null) {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;

  if (
    /\b(noun|adjective|verb|adverb)\s+paradigm\b/i.test(text) ||
    /\bparadigma\b/i.test(text) ||
    /\b(taivutus|taivutuskaava|sanaluokka)\b/i.test(text)
  ) {
    return true;
  }

  // Lone language labels the model sometimes prepends.
  if (
    /^(suomi|finnish|english|englanti|vietnamese|tiếng việt|vietnam)$/i.test(
      normalized,
    )
  ) {
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
