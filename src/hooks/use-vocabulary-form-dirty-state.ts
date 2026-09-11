"use client";

import { useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import {
  buildVocabularyFormSnapshot,
  vocabularyFormHasRequiredContent,
  vocabularyFormSnapshotsEqual,
  type VocabularyFormSnapshot,
} from "@/lib/vocabulary/form-snapshot";

type MeaningLike = {
  meaning: string;
  isPrimary: boolean;
};

type ExampleLike = {
  sentence: string;
  meaning: string;
  notes: string;
};

type VocabularyFormDirtyInitial = {
  word: string;
  partOfSpeech?: string | null;
  notesDoc: JSONContent;
  meanings: MeaningLike[];
  examples: ExampleLike[];
  tags: string[];
  synonymIds: string[];
  /** When false (new word), notes baseline is ready immediately. */
  hasId: boolean;
};

type VocabularyFormDirtyCurrent = {
  word: string;
  partOfSpeech?: string | null;
  notesDoc: JSONContent;
  meanings: MeaningLike[];
  examples: ExampleLike[];
  tags: string[];
  customTags: string[];
  synonymIds: string[];
};

/**
 * Owns vocabulary form baseline snapshot, dirty detection, and notes
 * hydration baseline adoption. Submit / lock stay in the form.
 */
export function useVocabularyFormDirtyState({
  initial,
  existingCustomTags,
  current,
}: {
  initial: VocabularyFormDirtyInitial;
  existingCustomTags?: string[];
  current: VocabularyFormDirtyCurrent;
}) {
  const [notesBaselineReady, setNotesBaselineReady] = useState(
    () => !initial.hasId,
  );
  const notesBaselineReadyRef = useRef(notesBaselineReady);
  const [baselineSnapshot, setBaselineSnapshot] =
    useState<VocabularyFormSnapshot>(() =>
      buildVocabularyFormSnapshot({
        word: initial.word,
        partOfSpeech: initial.partOfSpeech,
        notesDoc: initial.notesDoc,
        meanings: initial.meanings,
        examples: initial.examples,
        tags: initial.tags,
        customTags: existingCustomTags,
        synonymIds: initial.synonymIds,
      }),
    );
  const originalFieldsRef = useRef({
    word: initial.word,
    partOfSpeech: initial.partOfSpeech ?? null,
    meanings: initial.meanings,
    examples: initial.examples,
    tags: initial.tags,
    synonymIds: initial.synonymIds,
  });

  const {
    word,
    partOfSpeech,
    notesDoc,
    meanings,
    examples,
    tags,
    customTags,
    synonymIds,
  } = current;

  const currentSnapshot = useMemo(
    () =>
      buildVocabularyFormSnapshot({
        word,
        partOfSpeech,
        notesDoc,
        meanings,
        examples,
        tags,
        customTags,
        synonymIds,
      }),
    [
      word,
      partOfSpeech,
      notesDoc,
      meanings,
      examples,
      tags,
      customTags,
      synonymIds,
    ],
  );

  const hasRequiredContent = vocabularyFormHasRequiredContent(currentSnapshot);
  const isDirty =
    notesBaselineReady &&
    !vocabularyFormSnapshotsEqual(baselineSnapshot, currentSnapshot);
  const canSave = hasRequiredContent && (initial.hasId ? isDirty : true);

  function syncNotesBaselineReady(ready: boolean) {
    notesBaselineReadyRef.current = ready;
    setNotesBaselineReady(ready);
  }

  function adoptNotesBaseline(nextDoc: JSONContent) {
    const next = buildVocabularyFormSnapshot({
      word: originalFieldsRef.current.word,
      partOfSpeech: originalFieldsRef.current.partOfSpeech,
      notesDoc: nextDoc,
      meanings: originalFieldsRef.current.meanings,
      examples: originalFieldsRef.current.examples,
      tags: originalFieldsRef.current.tags,
      customTags: existingCustomTags,
      synonymIds: originalFieldsRef.current.synonymIds,
    });
    setBaselineSnapshot(next);
    syncNotesBaselineReady(true);
    return next;
  }

  return {
    notesBaselineReady,
    notesBaselineReadyRef,
    currentSnapshot,
    baselineSnapshot,
    hasRequiredContent,
    isDirty,
    canSave,
    adoptNotesBaseline,
    markNotesBaselineReady: () => syncNotesBaselineReady(true),
  };
}
