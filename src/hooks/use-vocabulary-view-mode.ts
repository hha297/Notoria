"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  isVocabularyViewMode,
  VOCABULARY_VIEW_MODE_KEY,
} from "@/lib/vocabulary/display";
import type { VocabularyViewMode } from "@/lib/vocabulary/types";

const VIEW_MODE_EVENT = "notoria-vocabulary-view-mode";

function readViewMode(): VocabularyViewMode {
  try {
    const stored = window.localStorage.getItem(VOCABULARY_VIEW_MODE_KEY);
    if (isVocabularyViewMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode, disabled storage).
  }
  return "list";
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(VIEW_MODE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(VIEW_MODE_EVENT, handler);
  };
}

function getServerSnapshot(): VocabularyViewMode {
  return "list";
}

export function useVocabularyViewMode() {
  const viewMode = useSyncExternalStore(subscribe, readViewMode, getServerSnapshot);

  const updateViewMode = useCallback((next: VocabularyViewMode) => {
    try {
      window.localStorage.setItem(VOCABULARY_VIEW_MODE_KEY, next);
    } catch {
      // Preference persistence is optional.
    }
    window.dispatchEvent(new Event(VIEW_MODE_EVENT));
  }, []);

  return [viewMode, updateViewMode] as const;
}
