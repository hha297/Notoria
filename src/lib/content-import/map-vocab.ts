import { cellForField, splitMultiValue } from "@/lib/content-import/map-columns";
import type {
  ColumnMapping,
  ImportIssue,
  VocabImportDraft,
} from "@/lib/content-import/types";
import { MAX_VOCAB_IMPORT_ROWS } from "@/lib/content-import/types";
import { normalizePartOfSpeech } from "@/lib/vocabulary/word-identity";

function issue(
  code: ImportIssue["code"],
  rowIndex: number,
  message: string,
  snippet?: string,
): ImportIssue {
  return { code, rowIndex, message, snippet };
}

export function mapVocabRows(
  rows: string[][],
  mappings: ColumnMapping[],
): VocabImportDraft[] {
  const seen = new Set<string>();
  const drafts: VocabImportDraft[] = [];

  for (let i = 0; i < rows.length && drafts.length < MAX_VOCAB_IMPORT_ROWS; i++) {
    const row = rows[i] ?? [];
    const word = cellForField(row, mappings, "word");
    const meaningRaw = cellForField(row, mappings, "meaning");
    const meanings = splitMultiValue(meaningRaw);
    const posRaw = cellForField(row, mappings, "partOfSpeech");
    const partOfSpeech = normalizePartOfSpeech(posRaw) || undefined;
    const examples = splitMultiValue(cellForField(row, mappings, "example"));
    const tags = splitMultiValue(cellForField(row, mappings, "tags"));
    const notes = cellForField(row, mappings, "notes") || undefined;

    const issues: ImportIssue[] = [];
    const snippet = row.filter(Boolean).slice(0, 4).join(" · ");

    if (!word && !meaningRaw && examples.length === 0 && !notes) {
      issues.push(
        issue(
          "EMPTY_ROW",
          i,
          "This row is empty. Skip it or fill in a word and meaning.",
          snippet,
        ),
      );
    } else {
      if (!word) {
        issues.push(
          issue(
            "MISSING_WORD",
            i,
            "We couldn't find a word in this row. Add the missing word or skip the row.",
            snippet,
          ),
        );
      }
      if (meanings.length === 0) {
        issues.push(
          issue(
            "MISSING_MEANING",
            i,
            "We couldn't find a meaning in this row. Add a meaning or skip the row.",
            snippet,
          ),
        );
      }
    }

    const identity = `${word.toLowerCase()}|${partOfSpeech ?? ""}`;
    if (word && seen.has(identity)) {
      issues.push(
        issue(
          "DUPLICATE_IN_FILE",
          i,
          `“${word}” appears more than once in this file. We'll keep the first ready copy.`,
          snippet,
        ),
      );
    } else if (word) {
      seen.add(identity);
    }

    const hasBlocking = issues.some(
      (item) =>
        item.code === "MISSING_WORD" ||
        item.code === "MISSING_MEANING" ||
        item.code === "EMPTY_ROW" ||
        item.code === "DUPLICATE_IN_FILE",
    );

    drafts.push({
      word,
      meanings,
      partOfSpeech: partOfSpeech || undefined,
      examples,
      tags,
      notes,
      rowIndex: i,
      status: hasBlocking ? "issue" : "ready",
      issues,
    });
  }

  return drafts;
}

/** Heuristic line parsing when users upload a plain list instead of CSV. */
export function parseVocabLinesFromText(text: string): VocabImportDraft[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_VOCAB_IMPORT_ROWS);

  const drafts: VocabImportDraft[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Patterns: "word - meaning", "word: meaning", "word — meaning", "word, meaning"
    const match =
      line.match(/^(.+?)\s*[-–—:]\s+(.+)$/) ||
      line.match(/^([^,;]+)\s*[,;]\s+(.+)$/);

    const word = (match?.[1] ?? "").trim();
    const meaning = (match?.[2] ?? "").trim();
    const issues: ImportIssue[] = [];

    if (!word || !meaning) {
      issues.push(
        issue(
          "INVALID_VALUE",
          i,
          "We couldn't split this line into a word and meaning. Try “word — meaning”.",
          line.slice(0, 80),
        ),
      );
    }

    const identity = word.toLowerCase();
    if (word && seen.has(identity)) {
      issues.push(
        issue(
          "DUPLICATE_IN_FILE",
          i,
          `“${word}” appears more than once in this file.`,
          line.slice(0, 80),
        ),
      );
    } else if (word) {
      seen.add(identity);
    }

    drafts.push({
      word,
      meanings: meaning ? [meaning] : [],
      examples: [],
      tags: [],
      rowIndex: i,
      status: issues.length > 0 ? "issue" : "ready",
      issues,
    });
  }

  return drafts;
}
