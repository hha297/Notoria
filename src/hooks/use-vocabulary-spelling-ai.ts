"use client";

import { useEffect, useRef, useState } from "react";
import { suggestVocabularySpelling } from "@/lib/actions/vocabulary-ai";
import type { VocabularySpellingResult } from "@/lib/vocabulary/ai-types";

const SPELLING_DEBOUNCE_MS = 200;
const MIN_WORD_LENGTH = 3;
const MIN_CONFIDENCE = 0.55;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

type UseVocabularySpellingAiOptions = {
  enabled: boolean;
  word: string;
  language: string;
  partOfSpeech?: string | null;
  initialWord?: string;
};

export function useVocabularySpellingAi({
  enabled,
  word,
  language,
  partOfSpeech,
  initialWord,
}: UseVocabularySpellingAiOptions) {
  const [isChecking, setIsChecking] = useState(false);
  const [suggestion, setSuggestion] = useState<VocabularySpellingResult | null>(
    null,
  );
  const requestId = useRef(0);
  const lastRequested = useRef("");
  const skipped = useRef(new Set<string>());
  const accepted = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) {
      requestId.current += 1;
      setIsChecking(false);
      setSuggestion(null);
      return;
    }

    const trimmed = word.trim();
    const key = normalize(trimmed);
    const requestKey = `${key}|${partOfSpeech ?? ""}|${language}`;
    const initialKey = initialWord ? normalize(initialWord) : "";

    if (
      trimmed.length < MIN_WORD_LENGTH ||
      key === initialKey ||
      skipped.current.has(key) ||
      accepted.current.has(key)
    ) {
      requestId.current += 1;
      setIsChecking(false);
      setSuggestion(null);
      return;
    }

    if (requestKey === lastRequested.current) {
      return;
    }

    const currentRequest = ++requestId.current;
    setSuggestion(null);

    const timer = window.setTimeout(() => {
      lastRequested.current = requestKey;
      setIsChecking(true);
      void (async () => {
        try {
          const result = await suggestVocabularySpelling({
            word: trimmed,
            language,
            partOfSpeech: partOfSpeech || null,
          });
          if (currentRequest !== requestId.current) return;

          if (
            !result.ok ||
            result.result.isLikelyValid ||
            !result.result.suggestion ||
            result.result.confidence < MIN_CONFIDENCE ||
            normalize(result.result.suggestion) === key
          ) {
            setSuggestion(null);
            return;
          }

          setSuggestion(result.result);
        } catch {
          if (currentRequest !== requestId.current) return;
          setSuggestion(null);
        } finally {
          if (currentRequest === requestId.current) {
            setIsChecking(false);
          }
        }
      })();
    }, SPELLING_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, word, language, partOfSpeech, initialWord]);

  function skip() {
    skipped.current.add(normalize(word));
    setSuggestion(null);
    setIsChecking(false);
  }

  function accept(nextWord: string) {
    accepted.current.add(normalize(nextWord));
    skipped.current.add(normalize(word));
    lastRequested.current = `${normalize(nextWord)}|${partOfSpeech ?? ""}|${language}`;
    setSuggestion(null);
    setIsChecking(false);
  }

  return { isChecking, suggestion, skip, accept };
}
