"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  collectionViewModeKey,
  isCollectionViewMode,
  type CollectionViewMode,
  type CollectionViewSection,
} from "@/lib/collection/view-mode";

const VIEW_MODE_EVENT = "notoria-collection-view-mode";

function readViewMode(section: CollectionViewSection): CollectionViewMode {
  try {
    const stored = window.localStorage.getItem(collectionViewModeKey(section));
    if (isCollectionViewMode(stored)) return stored;
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

function getServerSnapshot(): CollectionViewMode {
  return "list";
}

export function useCollectionViewMode(section: CollectionViewSection) {
  const viewMode = useSyncExternalStore(
    subscribe,
    () => readViewMode(section),
    getServerSnapshot,
  );

  const updateViewMode = useCallback(
    (next: CollectionViewMode) => {
      try {
        window.localStorage.setItem(collectionViewModeKey(section), next);
      } catch {
        // Preference persistence is optional.
      }
      window.dispatchEvent(new Event(VIEW_MODE_EVENT));
    },
    [section],
  );

  return [viewMode, updateViewMode] as const;
}
