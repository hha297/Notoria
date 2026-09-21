"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { Editor, JSONContent } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  SortableExamples,
  type ExampleItem,
} from "@/components/vocabulary/sortable-examples";
import {
  SortableMeanings,
  type MeaningItem,
} from "@/components/vocabulary/sortable-meanings";
import { TagMultiSelect } from "@/components/vocabulary/tag-multi-select";
import { SynonymPicker } from "@/components/vocabulary/synonym-picker";
import { VocabularyAiChecking, VocabularyAiSuggestionCard } from "@/components/vocabulary/ai-suggestion-card";
import { useAiPreferences } from "@/components/providers/ai-preferences-provider";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import {
  VocabularyComposerHero,
  VocabularyComposerSection,
  composerStyles,
} from "@/components/vocabulary/vocabulary-composer";
import { Label } from "@/components/ui/label";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  checkVocabularyWordExists,
  createVocabularyWord,
  updateVocabularyWord,
} from "@/lib/actions/vocabulary";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mx } from "@/lib/css-module";
import { afterEditorHydration } from "@/lib/editor/hydration";
import { navigateAfterSuccess } from "@/lib/navigation/after-success";
import {
  vocabularyListQueryOptions,
  vocabularySynonymOptionsQueryOptions,
  workspaceCustomTagsQueryOptions,
} from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import {
  parseVocabularyNotes,
  serializeVocabularyNotes,
} from "@/lib/vocabulary/notes-content";
import {
  countPrimaryMeanings,
  MAX_PRIMARY_MEANINGS,
} from "@/lib/vocabulary/primary-meanings";
import { VOCABULARY_WORD_EXISTS } from "@/lib/vocabulary-errors";
import { isSameVocabularyIdentity, normalizeVocabularyWord } from "@/lib/vocabulary/word-identity";
import { useMutationLock } from "@/hooks/use-mutation-lock";
import { useVocabularyFormDirtyState } from "@/hooks/use-vocabulary-form-dirty-state";
import { useVocabularySpellingAi } from "@/hooks/use-vocabulary-spelling-ai";
import {
  getCustomTagName,
  isCustomTagKey,
  normalizeWordTags,
  PARTS_OF_SPEECH,
  uniqueCustomTagNames,
} from "@/lib/vocabulary-tags";
import {
  vocabularyFormClientSchema,
  type VocabularyFormValues,
} from "@/schemas/vocabulary";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";

type VocabularyFormClientValues = Omit<
  VocabularyFormValues,
  "meanings" | "examples" | "tags" | "synonymIds"
>;

export type VocabularyFormInitialData = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  notes?: string | null;
  synonymRefs?: VocabularySynonymRef[];
  meanings: Array<{
    id: string;
    meaning: string;
    isPrimary?: boolean;
    sortOrder: number;
  }>;
  examples: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>;
  tags: Array<{
    tag: string;
  }>;
};

type VocabularyFormProps = {
  /** When set, Cancel returns here and Save navigates here after persisting. */
  previewHref?: string;
  workspaceId?: string;
  existingCustomTags?: string[];
  synonymOptions?: VocabularySynonymRef[];
  language?: string;
  initialData?: VocabularyFormInitialData;
  /** `modal` hides the page card chrome and reports success via `onSuccess`. */
  mode?: "page" | "modal";
  onSuccess?: () => void;
  onCancel?: () => void;
};

type WordCheckStatus = "idle" | "pending" | "checking" | "duplicate" | "unique" | "error";

const WORD_CHECK_DEBOUNCE_MS = 300;

function normalizeWordInput(word: string) {
  return normalizeVocabularyWord(word);
}

function createDefaultMeanings(): MeaningItem[] {
  return [
    {
      id: "new-meaning-0",
      meaning: "",
      isPrimary: true,
      sortOrder: 0,
    },
  ];
}

function createDefaultExamples(): ExampleItem[] {
  return [
    {
      id: "new-example-0",
      sentence: "",
      meaning: "",
      notes: "",
      sortOrder: 0,
    },
  ];
}

function getInitialExamples(
  examples?: Array<{
    id: string;
    sentence: string;
    meaning?: string | null;
    notes?: string | null;
    sortOrder: number;
  }>,
): ExampleItem[] {
  if (!examples?.length) {
    return createDefaultExamples();
  }

  return examples.map((example) => ({
    id: example.id,
    sentence: example.sentence,
    meaning: example.meaning ?? "",
    notes: example.notes ?? "",
    sortOrder: example.sortOrder,
  }));
}

function getInitialCustomTags(
  existingCustomTags: string[] | undefined,
  tags: Array<{ tag: string }> | undefined,
): string[] {
  const fromWord = tags
    ?.map((tag) => tag.tag)
    .filter(isCustomTagKey)
    .map(getCustomTagName) ?? [];

  return uniqueCustomTagNames([...(existingCustomTags ?? []), ...fromWord]);
}

export function VocabularyForm({
  initialData,
  previewHref,
  workspaceId,
  existingCustomTags,
  synonymOptions = [],
  language = "en",
  mode = "page",
  onSuccess,
  onCancel,
}: VocabularyFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("vocabulary");
  const { suggestionsAllowed, shouldAutoApplyContentChange } = useAiPreferences();
  const tCommon = useTranslations("common");
  const tPos = useTranslations("tags.pos");
  const isModal = mode === "modal";
  const { isPending: isSaving, tryBegin, release } = useMutationLock();
  const [wordCheckStatus, setWordCheckStatus] =
    useState<WordCheckStatus>("idle");
  const [meanings, setMeanings] = useState<MeaningItem[]>(
    initialData?.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      isPrimary: meaning.isPrimary ?? true,
      sortOrder: meaning.sortOrder,
    })) ?? createDefaultMeanings(),
  );
  const [examples, setExamples] = useState<ExampleItem[]>(() =>
    getInitialExamples(initialData?.examples),
  );
  const [tags, setTags] = useState<string[]>(() =>
    normalizeWordTags(
      initialData?.tags.map((tag) => tag.tag) ?? [],
      existingCustomTags,
    ),
  );
  const [localCustomTags, setLocalCustomTags] = useState<string[]>(() =>
    getInitialCustomTags(existingCustomTags, initialData?.tags),
  );
  const [synonyms, setSynonyms] = useState<VocabularySynonymRef[]>(
    initialData?.synonymRefs ?? [],
  );
  const [localSynonyms, setLocalSynonyms] = useState<VocabularySynonymRef[]>(
    synonymOptions,
  );
  const synonymQuery = useQuery({
    ...vocabularySynonymOptionsQueryOptions(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  });
  const customTagsQuery = useQuery({
    ...workspaceCustomTagsQueryOptions(workspaceId ?? ""),
    enabled: Boolean(workspaceId),
  });
  const customTags = uniqueCustomTagNames([
    ...(customTagsQuery.data ?? existingCustomTags ?? []),
    ...localCustomTags,
  ]);
  const availableSynonyms = useMemo(() => {
    const merged = new Map<string, VocabularySynonymRef>();
    for (const item of synonymQuery.data ?? []) {
      merged.set(item.id, item);
    }
    for (const item of localSynonyms) {
      merged.set(item.id, item);
    }
    return Array.from(merged.values());
  }, [synonymQuery.data, localSynonyms]);

  const initialNotesDoc = useMemo(
    () => parseVocabularyNotes(initialData?.notes ?? ""),
    [initialData?.notes],
  );

  const form = useForm<VocabularyFormClientValues>({
    resolver: zodResolver(vocabularyFormClientSchema),
    defaultValues: {
      word: initialData?.word ?? "",
      partOfSpeech:
        (initialData?.partOfSpeech as VocabularyFormClientValues["partOfSpeech"]) ??
        undefined,
      notes: serializeVocabularyNotes(initialNotesDoc),
    },
  });

  const [notesDoc, setNotesDoc] = useState<JSONContent>(() =>
    structuredClone(initialNotesDoc),
  );
  const [notesImageUploading, setNotesImageUploading] = useState(false);
  const notesHydrationCancelRef = useRef<(() => void) | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const watchedWord = form.watch("word");
  const watchedPartOfSpeech = form.watch("partOfSpeech");
  const wordCheckRequestId = useRef(0);
  const synonymIds = useMemo(
    () => synonyms.map((item) => item.id),
    [synonyms],
  );

  const {
    canSave,
    adoptNotesBaseline,
    markNotesBaselineReady,
  } = useVocabularyFormDirtyState({
    initial: {
      word: initialData?.word ?? "",
      partOfSpeech: initialData?.partOfSpeech,
      notesDoc: initialNotesDoc,
      meanings:
        initialData?.meanings.map((meaning) => ({
          meaning: meaning.meaning,
          isPrimary: meaning.isPrimary ?? true,
        })) ?? createDefaultMeanings(),
      examples: getInitialExamples(initialData?.examples),
      tags: initialData?.tags.map((tag) => tag.tag) ?? [],
      synonymIds: (initialData?.synonymRefs ?? []).map((item) => item.id),
      hasId: Boolean(initialData?.id),
    },
    existingCustomTags,
    current: {
      word: watchedWord ?? "",
      partOfSpeech: watchedPartOfSpeech,
      notesDoc,
      meanings,
      examples,
      tags,
      customTags,
      synonymIds,
    },
  });

  useEffect(() => {
    return () => {
      notesHydrationCancelRef.current?.();
    };
  }, []);

  function handleAdoptNotesBaseline(nextDoc: JSONContent) {
    setNotesDoc(nextDoc);
    form.setValue("notes", serializeVocabularyNotes(nextDoc), {
      shouldDirty: false,
    });
    adoptNotesBaseline(nextDoc);
  }

  function handleNotesEditorReady(editor: Editor | null) {
    notesHydrationCancelRef.current?.();
    notesHydrationCancelRef.current = null;
    if (!editor) return;
    if (!initialData?.id) {
      markNotesBaselineReady();
      return;
    }
    notesHydrationCancelRef.current = afterEditorHydration(() => {
      handleAdoptNotesBaseline(editor.getJSON());
    });
  }

  useEffect(() => {
    const normalized = normalizeWordInput(watchedWord ?? "");

    if (!normalized) {
      wordCheckRequestId.current += 1;
      setWordCheckStatus("idle");
      return;
    }

    // Editing this same word + part of speech is always allowed.
    if (
      initialData?.id &&
      isSameVocabularyIdentity(
        { word: watchedWord ?? "", partOfSpeech: watchedPartOfSpeech },
        { word: initialData.word, partOfSpeech: initialData.partOfSpeech },
      )
    ) {
      wordCheckRequestId.current += 1;
      setWordCheckStatus("unique");
      return;
    }

    const requestId = ++wordCheckRequestId.current;
    setWordCheckStatus("pending");

    const timer = setTimeout(() => {
      setWordCheckStatus("checking");
      void (async () => {
        try {
          const result = await checkVocabularyWordExists(
            normalized,
            initialData?.id,
            watchedPartOfSpeech,
          );
          if (requestId !== wordCheckRequestId.current) return;
          setWordCheckStatus(result.exists ? "duplicate" : "unique");
        } catch {
          if (requestId !== wordCheckRequestId.current) return;
          // Do not block save on network/check failure.
          setWordCheckStatus("error");
        }
      })();
    }, WORD_CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    watchedWord,
    watchedPartOfSpeech,
    initialData?.id,
    initialData?.word,
    initialData?.partOfSpeech,
  ]);

  async function onSubmit(values: VocabularyFormClientValues) {
    if (
      wordCheckStatus === "duplicate" ||
      wordCheckStatus === "checking" ||
      wordCheckStatus === "pending"
    ) {
      return;
    }

    if (!canSave) return;

    const filledMeanings = meanings
      .map((item, index) => ({
        id: item.id,
        meaning: item.meaning.trim(),
        isPrimary: item.isPrimary,
        sortOrder: index,
      }))
      .filter((item) => item.meaning.length > 0);

    if (filledMeanings.length === 0) {
      toast.error(t("meaningRequired"));
      return;
    }

    const primaryCount = countPrimaryMeanings(filledMeanings);
    if (primaryCount < 1) {
      toast.error(t("primaryMeaningRequired"));
      return;
    }
    if (primaryCount > MAX_PRIMARY_MEANINGS) {
      toast.error(t("primaryMeaningLimit", { max: MAX_PRIMARY_MEANINGS }));
      return;
    }

    const filledExamples = examples
      .map((item, index) => ({
        id: item.id,
        sentence: item.sentence.trim(),
        meaning: item.meaning.trim(),
        notes: item.notes.trim(),
        sortOrder: index,
      }))
      .filter((item) => item.sentence.length > 0);

    if (!tryBegin()) return;

    try {
      const payload = {
        ...values,
        meanings: filledMeanings,
        examples: filledExamples,
        tags: normalizeWordTags(tags, customTags),
        synonymIds: synonyms.map((item) => item.id),
      };

      if (initialData?.id) {
        await updateVocabularyWord(initialData.id, payload);
        if (workspaceId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.vocabulary.all(workspaceId),
          });
          void queryClient
            .prefetchQuery(vocabularyListQueryOptions(workspaceId))
            .catch(() => undefined);
        }
        if (onSuccess) {
          onSuccess();
          toast.success(t("updated"));
          // Keep lock true while the modal closes / form unmounts.
          return;
        }
        try {
          router.prefetch(previewHref ?? "/vocabulary");
        } catch {
          // Prefetch is best-effort.
        }
        navigateAfterSuccess(router, previewHref ?? "/vocabulary", {
          toast: () => toast.success(t("updated")),
        });
      } else {
        await createVocabularyWord(payload);
        if (workspaceId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.vocabulary.all(workspaceId),
          });
          void queryClient
            .prefetchQuery(vocabularyListQueryOptions(workspaceId))
            .catch(() => undefined);
        }
        try {
          router.prefetch("/vocabulary");
        } catch {
          // Prefetch is best-effort.
        }
        navigateAfterSuccess(router, "/vocabulary", {
          toast: () => toast.success(t("saved")),
        });
      }
      // Keep isSaving/lock true through navigation so Save cannot flash enabled.
    } catch (error) {
      release();

      if (error instanceof Error && error.message === VOCABULARY_WORD_EXISTS) {
        setWordCheckStatus("duplicate");
        toast.error(t("wordExists"));
        return;
      }

      toast.error(
        error instanceof Error ? error.message : t("meaningRequired"),
      );
    }
  }

  const selectedPartOfSpeech = form.watch("partOfSpeech");
  const spellingAi = useVocabularySpellingAi({
    enabled:
      (wordCheckStatus === "unique" || wordCheckStatus === "error") &&
      suggestionsAllowed,
    word: watchedWord ?? "",
    language,
    partOfSpeech: selectedPartOfSpeech,
    initialWord: initialData?.word,
  });

  useEffect(() => {
    const nextWord = spellingAi.suggestion?.suggestion;
    if (!shouldAutoApplyContentChange || !nextWord) return;
    spellingAi.accept(nextWord);
    form.setValue("word", nextWord, {
      shouldDirty: true,
      shouldTouch: true,
    });
    // Only react to a new suggestion payload, not the whole spellingAi object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accept/setValue are stable enough for this apply-once path
  }, [shouldAutoApplyContentChange, spellingAi.suggestion?.suggestion]);
  const isDuplicate = wordCheckStatus === "duplicate";
  const isCheckingWord = wordCheckStatus === "checking";
  const isWordBusy = isCheckingWord || spellingAi.isChecking;
  const saveDisabled =
    isSaving ||
    !canSave ||
    isDuplicate ||
    isCheckingWord ||
    wordCheckStatus === "pending" ||
    notesImageUploading;

  function handleNotesChange(doc: JSONContent) {
    setNotesDoc(doc);
    form.setValue("notes", serializeVocabularyNotes(doc), {
      shouldDirty: true,
      shouldTouch: true,
    });
  }

  function handleCancel() {
    if (isSaving) return;
    if (onCancel) {
      onCancel();
      return;
    }
    if (previewHref) {
      router.replace(previewHref);
    }
  }

  const showCancel = Boolean(onCancel || previewHref);

  useRegisterShortcutAction("quickSave", () => {
    formRef.current?.requestSubmit();
  });
  useRegisterShortcutAction(
    "quickView",
    () => {
      if (previewHref) router.replace(previewHref);
    },
    Boolean(previewHref),
  );

  return (
    <form
      ref={formRef}
      onSubmit={form.handleSubmit(onSubmit)}
      className={mx(
        composerStyles,
        "vocab-composer",
        isModal ? "space-y-6" : "space-y-8",
      )}
    >
      {!isModal ? (
        <VocabularyComposerHero
          eyebrow={t("title")}
          title={initialData ? t("editWord") : t("addWord")}
          highlight={initialData ? initialData.word : t("addWordHighlight")}
          description={initialData ? t("editDescription") : t("formDescription")}
          addingToLabel={t("addingTo")}
          languageCode={language}
          actions={
            <ShowTutorialButton
              section="vocabularyAdd"
              autoOpenIfIncomplete={!initialData}
            />
          }
        />
      ) : null}

      <VocabularyComposerSection slot="word" className="space-y-4">
        <div className="grid grid-cols-1 gap-x-5 gap-y-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(14rem,0.55fr)]">
          <Label
            htmlFor="word"
            className={mx(
              composerStyles,
              "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.18em] uppercase lg:col-start-1 lg:row-start-1",
            )}
          >
            {t("word")}
          </Label>
          <div
            className="relative lg:col-start-1 lg:row-start-2"
            data-tutorial="vocab-composer-word"
          >
            <CapitalizedInput
              id="word"
              placeholder={t("wordPlaceholder")}
              className={mx(
                composerStyles,
                "vocab-composer-word-field vocab-composer-control pr-12 font-heading text-[1.3rem] sm:text-[1.5rem]",
                wordCheckStatus === "unique" && "vocab-composer-word-ok",
              )}
              aria-invalid={isDuplicate || undefined}
              aria-describedby={
                isDuplicate ||
                  wordCheckStatus === "error" ||
                  isWordBusy
                  ? "word-duplicate-status"
                  : undefined
              }
              {...form.register("word")}
            />
            {isWordBusy ? (
              <Loader2
                className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-(--composer-word)"
                aria-hidden
              />
            ) : null}
          </div>
          <Label
            className={mx(
              composerStyles,
              "vocab-composer-kicker mt-3 text-[0.68rem] font-semibold tracking-[0.18em] uppercase lg:col-start-2 lg:row-start-1 lg:mt-0",
            )}
          >
            {t("partOfSpeech")}
          </Label>
          <div
            className="lg:col-start-2 lg:row-start-2"
            data-tutorial="vocab-composer-pos"
          >
            <Select
              value={form.watch("partOfSpeech") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "partOfSpeech",
                  value
                    ? (value as VocabularyFormClientValues["partOfSpeech"])
                    : undefined,
                  { shouldDirty: true, shouldTouch: true },
                )
              }
            >
              <SelectTrigger
                className={mx(
                  composerStyles,
                  "vocab-composer-word-field vocab-composer-control h-16! w-full rounded-md px-3 py-0! data-[size=default]:h-16!",
                )}
              >
                <SelectValue placeholder={t("partOfSpeechPlaceholder")}>
                  {selectedPartOfSpeech &&
                    PARTS_OF_SPEECH.includes(
                      selectedPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
                    )
                    ? tPos(
                      selectedPartOfSpeech as (typeof PARTS_OF_SPEECH)[number],
                    )
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PARTS_OF_SPEECH.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {tPos(pos)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 empty:hidden lg:col-span-2">
            {form.formState.errors.word ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.word.message}
              </p>
            ) : null}
            {isCheckingWord ? (
              <p
                id="word-duplicate-status"
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
                role="status"
              >
                {t("wordExistsChecking")}
              </p>
            ) : null}
            {isDuplicate ? (
              <p
                id="word-duplicate-status"
                className="text-sm text-destructive"
                role="alert"
              >
                {t("wordExists")}
              </p>
            ) : null}
            {wordCheckStatus === "error" ? (
              <p
                id="word-duplicate-status"
                className="text-sm text-muted-foreground"
                role="status"
              >
                {t("wordExistsCheckFailed")}
              </p>
            ) : null}
            {!isCheckingWord && spellingAi.isChecking ? (
              <VocabularyAiChecking id="word-duplicate-status" />
            ) : null}
            {spellingAi.suggestion?.suggestion ? (
              <VocabularyAiSuggestionCard
                body={
                  spellingAi.suggestion.explanation?.trim() ||
                  t("aiDidYouMean", {
                    word: spellingAi.suggestion.suggestion,
                  })
                }
                acceptLabel={t("aiUseWord", {
                  word: spellingAi.suggestion.suggestion,
                })}
                onAccept={() => {
                  const nextWord = spellingAi.suggestion?.suggestion;
                  if (!nextWord) return;
                  spellingAi.accept(nextWord);
                  form.setValue("word", nextWord, {
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                }}
                onSkip={spellingAi.skip}
              />
            ) : null}
          </div>
        </div>
      </VocabularyComposerSection>

      <VocabularyComposerSection
        slot="meaning"
        data-tutorial="vocab-composer-meanings"
      >
        <SortableMeanings
          meanings={meanings}
          onChange={setMeanings}
          ai={{
            enabled: suggestionsAllowed,
            word: watchedWord ?? "",
            language,
            partOfSpeech: selectedPartOfSpeech,
            examples: examples
              .map((example) => example.sentence.trim())
              .filter(Boolean)
              .slice(0, 6),
            autoApply: shouldAutoApplyContentChange,
          }}
        />
      </VocabularyComposerSection>

      <VocabularyComposerSection
        slot="example"
        data-tutorial="vocab-composer-examples"
      >
        <SortableExamples examples={examples} onChange={setExamples} />
      </VocabularyComposerSection>

      <VocabularyComposerSection slot="extra" className="space-y-6">
        <div data-tutorial="vocab-composer-tags">
          <TagMultiSelect
            value={tags}
            onChange={setTags}
            customTags={customTags}
            onCustomTagsChange={setLocalCustomTags}
          />
        </div>

        <div data-tutorial="vocab-composer-synonyms">
          <SynonymPicker
            value={synonyms}
            onChange={setSynonyms}
            options={availableSynonyms}
            onOptionsChange={setLocalSynonyms}
            currentWordId={initialData?.id}
            currentWord={watchedWord}
          />
        </div>

        <div className="space-y-2" data-tutorial="vocab-composer-notes">
          <Label
            htmlFor="notes-editor"
            className={mx(
              composerStyles,
              "vocab-composer-kicker font-heading text-base font-bold tracking-tight",
            )}
          >
            {t("notes")}
          </Label>
          <div id="notes-editor">
            <RichTextEditor
              content={notesDoc}
              placeholder={t("notesPlaceholder")}
              variant="notes"
              language={language}
              formatWord={watchedWord}
              onChange={handleNotesChange}
              onImageUploadPendingChange={setNotesImageUploading}
              onEditorReady={handleNotesEditorReady}
            />
          </div>
        </div>
      </VocabularyComposerSection>

      <div
        className={mx(
          composerStyles,
          "vocab-composer-actions sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 px-1 py-3 sm:static sm:flex-row sm:justify-end sm:py-0",
        )}
      >
        {showCancel ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-12 w-full sm:h-11 sm:w-auto"
          >
            {tCommon("cancel")}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={saveDisabled}
          size="lg"
          data-tutorial="vocab-composer-save"
          className={mx(
            composerStyles,
            "vocab-composer-submit h-12 w-full sm:h-11 sm:min-w-44 sm:w-auto",
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {initialData ? t("updatingWord") : t("savingWord")}
            </>
          ) : (
            <>
              <Save className="size-4" />
              {initialData ? t("updateWord") : t("saveWord")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
