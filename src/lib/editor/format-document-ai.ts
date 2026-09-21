import type { JSONContent } from "@tiptap/react";
import OpenAI from "openai";
import { aiSystemPrompt } from "@/lib/ai/system-prompt";
import {
  vocabularyNotesFormatResultSchema,
  type VocabularyNotesFormatBlock,
} from "@/lib/vocabulary/ai-types";
import {
  notesFormatBlocksToDoc,
  sanitizeVocabularyNotesFormatBlocks,
} from "@/lib/vocabulary/format-notes-ai";
import { getLanguageByCode } from "@/lib/languages";
import { tipTapNodePlainText } from "@/lib/editor/format/types";
import { PARADIGM_AI_RULES } from "@/lib/editor/format/paradigm-ai-rules";

const PRESERVED_NODE_TYPES = new Set(["image", "horizontalRule"]);

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  return new OpenAI({ apiKey, timeout: 60_000 });
}

function parseJsonContent(content: string | null | undefined) {
  if (!content?.trim()) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function documentFormatSystemPrompt(): string {
  return `You restructure study notes / lesson content for a TipTap rich-text editor.

Goal: turn messy pasted text into clean structured content. Decide headings, lists, and tables from the content itself — not from a fixed language or lesson template.

Rules:
1. Preserve the learner's information. Do not invent facts, forms, titles, or rows that are not supported by the source. You MAY normalize morphology; that is analysis, not invention.
2. Promote clear section titles to headings (level 1–3). For numbered outlines like "1.", "1.1", "1.1.1", set level from the numbering depth (1 → 1, 1.1 → 2, 1.1.1 → 3). Keep the numbering text in the heading.
3. Convert tabular / paradigm content into tables when the text clearly has columns/rows (pipes, tabs, aligned columns, or repeated label+value paradigms). Headers and columns must match the study language and the notes — never force a fixed header set from another language.
4. Put category/label columns first when that matches the source. Set boldFirstColumn true for label columns.
5. Use bulletList / orderedList for list-like lines. Keep normal prose as paragraphs.
6. Do NOT invent decorative titles (e.g. "Noun Paradigm", lone language names, or summaries of a table).
7. Do not wrap everything in a table if it is not tabular.
8. Do NOT emit empty paragraphs, placeholder text, or blank filler blocks.
9. Return JSON only:
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
10. Each table row must have the same number of cells as headers.
11. No markdown. No commentary outside JSON.

${PARADIGM_AI_RULES}`;
}

export type FormatEditorDocumentAiInput = {
  text: string;
  language?: string | null;
  /** Optional vocabulary headword; unused for theory/writing. */
  word?: string | null;
};

/**
 * Ask AI to restructure editor plain text into typed TipTap blocks.
 * One call per Format click — no per-section fan-out.
 */
export async function formatEditorDocumentWithAi(
  input: FormatEditorDocumentAiInput,
): Promise<JSONContent> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("EMPTY_CONTENT");
  }

  const client = getOpenAIClient();
  const languageHint = input.language
    ? (getLanguageByCode(input.language)?.name ?? input.language)
    : null;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 8_000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: await aiSystemPrompt(documentFormatSystemPrompt(), {
          responseStyle: true,
        }),
      },
      {
        role: "user",
        content: JSON.stringify({
          studyLanguageHint: languageHint,
          word: input.word?.trim() || null,
          content: text,
          reminder:
            "Merge same-label rows with formA/formB. Strip person/possessive endings. First column = category labels only. Do not trust messy dump labels.",
        }),
      },
    ],
  });

  const parsed = vocabularyNotesFormatResultSchema.safeParse(
    parseJsonContent(completion.choices[0]?.message?.content),
  );
  if (!parsed.success) {
    console.error(
      "editor document format AI parse failed",
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
    throw new Error("AI_INVALID_RESPONSE");
  }

  const blocks: VocabularyNotesFormatBlock[] =
    sanitizeVocabularyNotesFormatBlocks(parsed.data.blocks, input.word);
  if (blocks.length === 0) {
    throw new Error("AI_EMPTY_BLOCKS");
  }

  return notesFormatBlocksToDoc(blocks);
}

/** Collect image / HR nodes so Format does not drop them. */
export function collectPreservedEditorNodes(doc: JSONContent): JSONContent[] {
  const preserved: JSONContent[] = [];
  for (const node of doc.content ?? []) {
    if (PRESERVED_NODE_TYPES.has(node.type ?? "")) {
      preserved.push(structuredClone(node));
    }
  }
  return preserved;
}

/**
 * Re-attach preserved non-text nodes (images, rules) that plain-text AI cannot see.
 */
export function mergePreservedEditorNodes(
  original: JSONContent,
  formatted: JSONContent,
): JSONContent {
  const preserved = collectPreservedEditorNodes(original);
  if (preserved.length === 0) return formatted;

  const existingSrcs = new Set(
    (formatted.content ?? [])
      .filter((node) => node.type === "image")
      .map((node) =>
        typeof node.attrs?.src === "string" ? node.attrs.src : "",
      )
      .filter(Boolean),
  );

  const missing = preserved.filter((node) => {
    if (node.type !== "image") return true;
    const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
    return src ? !existingSrcs.has(src) : true;
  });

  if (missing.length === 0) return formatted;

  const content = [...(formatted.content ?? [])];
  const last = content[content.length - 1];
  if (last?.type === "paragraph" && !(last.content?.length)) {
    content.pop();
  }
  content.push(...missing);
  content.push({ type: "paragraph" });
  return { type: "doc", content };
}

export function editorDocToFormatPlainText(doc: JSONContent): string {
  return tipTapNodePlainText(doc).trim();
}
