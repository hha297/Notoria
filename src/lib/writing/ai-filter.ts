import type {
  WritingAiAction,
  WritingAiResult,
  WritingAiSuggestion,
} from "@/lib/writing/ai-types";
import { contentContainsPhrase } from "@/lib/writing/plain-text";

export const MIN_WRITING_ERROR_CONFIDENCE = 0.55;
export const MIN_WRITING_OPTIONAL_CONFIDENCE = 0.7;

const GRAMMAR_TYPES = new Set(["grammar", "spelling"]);

type FilterOptions = {
  action?: WritingAiAction;
  content?: string;
};

export function filterWritingSuggestions(
  suggestions: WritingAiSuggestion[],
  options: FilterOptions = {},
): WritingAiSuggestion[] {
  const seen = new Set<string>();

  return suggestions.filter((item) => {
    const original = item.original.trim();
    const replacement = item.replacement.trim();
    if (!original || !replacement) return false;
    if (original === replacement) return false;

    if (options.action === "correct" && !GRAMMAR_TYPES.has(item.type)) {
      return false;
    }

    if (options.content && !contentContainsPhrase(options.content, original)) {
      return false;
    }

    const minimum =
      item.severity === "error"
        ? MIN_WRITING_ERROR_CONFIDENCE
        : MIN_WRITING_OPTIONAL_CONFIDENCE;
    if (item.confidence < minimum) return false;

    const key = `${item.type}|${original.toLowerCase()}|${replacement.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeWritingAiResult(
  result: WritingAiResult,
  options: FilterOptions = {},
): WritingAiResult {
  return {
    ...result,
    continuation: options.action === "continue" ? result.continuation : null,
    suggestions: filterWritingSuggestions(result.suggestions, options).map(
      (item, index) => ({
        ...item,
        id: item.id?.trim() || String(index + 1),
        original: item.original.trim(),
        replacement: item.replacement.trim(),
      }),
    ),
  };
}
