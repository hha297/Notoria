"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import styles from "@/components/style/vocabulary/tag-manager.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";
import {
  addTagToVocabularyWords,
  removeTagFromVocabularyWords,
} from "@/lib/actions/vocabulary-tag-manager";
import {
  vocabularyListQueryOptions,
  workspaceCustomTagsQueryOptions,
} from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import { primaryMeaningText } from "@/lib/vocabulary/synonyms";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";
import {
  countWordsWithTag,
  defaultTagManagerTagId,
  filterWordsForTagManager,
  isWordSelectableForTagOperation,
  listTagManagerCustomTagIds,
  partitionWordsByTagMembership,
  selectionOperationForTag,
  TAG_MANAGER_GROUPS,
  tagManagerKindForId,
  tagManagerTagIds,
  wordHasTag,
  type TagManagerGroup,
  type TagManagerOperation,
} from "@/lib/vocabulary/tag-manager";
import { BUILTIN_TAG_GROUPS, getTagLabel } from "@/lib/vocabulary-tags";

type TagManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialGroup?: TagManagerGroup;
};

const EMPTY_WORDS: VocabularyWordRow[] = [];
const EMPTY_CUSTOM: string[] = [];

type TagListItem = {
  id: string;
  label: string;
  count: number;
};

export function TagManagerDialog({
  open,
  onOpenChange,
  workspaceId,
  initialGroup = "topic",
}: TagManagerDialogProps) {
  const t = useTranslations("vocabulary.tagManager");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const [tagSource, setTagSource] = useState<"standard" | "custom">("standard");
  const [standardGroup, setStandardGroup] =
    useState<TagManagerGroup>(initialGroup);
  const [selectedTagId, setSelectedTagId] = useState<string>(() =>
    defaultTagManagerTagId(initialGroup),
  );
  const [search, setSearch] = useState("");
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pending, startTransition] = useTransition();

  const wordsQuery = useQuery({
    ...vocabularyListQueryOptions(workspaceId),
    enabled: open && Boolean(workspaceId),
  });
  const customTagsQuery = useQuery({
    ...workspaceCustomTagsQueryOptions(workspaceId),
    enabled: open && Boolean(workspaceId),
  });

  const words = wordsQuery.data ?? EMPTY_WORDS;
  const customNames = customTagsQuery.data ?? EMPTY_CUSTOM;

  const customTagIds = useMemo(
    () => listTagManagerCustomTagIds(customNames, words),
    [customNames, words],
  );

  const standardTagOptions = useMemo<TagListItem[]>(() => {
    return BUILTIN_TAG_GROUPS[standardGroup].map((tag) => ({
      id: tag.id,
      label: getTagLabel(tag.id, (key) => tTags(key)),
      count: countWordsWithTag(words, tag.id),
    }));
  }, [standardGroup, tTags, words]);

  const customTagOptions = useMemo<TagListItem[]>(() => {
    return customTagIds.map((id) => ({
      id,
      label: getTagLabel(id, (key) => tTags(key)),
      count: countWordsWithTag(words, id),
    }));
  }, [customTagIds, tTags, words]);

  const selectedKind = tagManagerKindForId(selectedTagId);

  function resetManagerState(nextGroup: TagManagerGroup = initialGroup) {
    setTagSource("standard");
    setStandardGroup(nextGroup);
    setSelectedTagId(defaultTagManagerTagId(nextGroup));
    setSearch("");
    setSelectedWordIds(new Set());
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetManagerState(initialGroup);
    }
    onOpenChange(nextOpen);
  }

  function selectTagSource(next: "standard" | "custom") {
    setTagSource(next);
    setSelectedWordIds(new Set());
    if (next === "standard") {
      setSelectedTagId(defaultTagManagerTagId(standardGroup));
      return;
    }
    const firstCustom = customTagIds[0];
    if (firstCustom) setSelectedTagId(firstCustom);
  }

  function selectStandardGroup(nextGroup: TagManagerGroup) {
    setTagSource("standard");
    setStandardGroup(nextGroup);
    const nextId = tagManagerTagIds(nextGroup)[0];
    if (nextId) {
      setSelectedTagId(nextId);
      setSelectedWordIds(new Set());
    }
  }

  function selectTag(tagId: string) {
    setSelectedTagId(tagId);
    setSelectedWordIds(new Set());
  }

  const visibleWords = useMemo(
    () =>
      filterWordsForTagManager(words, {
        tagId: selectedTagId,
        search,
      }),
    [words, selectedTagId, search],
  );

  const { assigned: assignedWords, other: otherWords } = useMemo(
    () => partitionWordsByTagMembership(visibleWords, selectedTagId),
    [visibleWords, selectedTagId],
  );

  const operation = useMemo(
    () => selectionOperationForTag(words, selectedWordIds, selectedTagId),
    [words, selectedWordIds, selectedTagId],
  );

  const selectedTagLabel = getTagLabel(selectedTagId, (key) => tTags(key));
  const selectedCount = selectedWordIds.size;
  const searchActive = search.trim().length > 0;

  function toggleWord(word: VocabularyWordRow) {
    if (!isWordSelectableForTagOperation(word, selectedTagId, operation)) {
      return;
    }
    setSelectedWordIds((current) => {
      const next = new Set(current);
      if (next.has(word.id)) next.delete(word.id);
      else next.add(word.id);
      return next;
    });
  }

  function toggleSection(
    sectionWords: VocabularyWordRow[],
    sectionOp: TagManagerOperation,
  ) {
    const selectable = sectionWords.filter((word) =>
      isWordSelectableForTagOperation(word, selectedTagId, operation),
    );
    if (selectable.length === 0) return;
    if (operation !== null && operation !== sectionOp) return;

    const allSelected = selectable.every((word) =>
      selectedWordIds.has(word.id),
    );
    setSelectedWordIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        for (const word of selectable) next.delete(word.id);
      } else {
        for (const word of selectable) next.add(word.id);
      }
      return next;
    });
  }

  async function refreshList() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.vocabulary.all(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.customTags(workspaceId),
      }),
    ]);
  }

  function runOperation() {
    if (!selectedTagId || !operation || selectedWordIds.size === 0 || pending) {
      return;
    }

    const wordIds = [...selectedWordIds].filter((id) => {
      const word = words.find((item) => item.id === id);
      return (
        word &&
        isWordSelectableForTagOperation(word, selectedTagId, operation)
      );
    });
    if (wordIds.length === 0) return;

    const tagId = selectedTagId;
    const tagLabel = selectedTagLabel;
    const mode = operation;

    startTransition(async () => {
      const result =
        mode === "add"
          ? await addTagToVocabularyWords({ tagId, wordIds })
          : await removeTagFromVocabularyWords({ tagId, wordIds });

      if (!result.ok) {
        toast.error(t("error"));
        return;
      }
      if (result.affected === 0) {
        toast.error(t("error"));
        await refreshList();
        return;
      }

      toast.success(
        mode === "add"
          ? t("added", { count: result.affected, tag: tagLabel })
          : t("removed", { count: result.affected, tag: tagLabel }),
      );
      setSelectedWordIds(new Set());
      await refreshList();
    });
  }

  function renderTagButton(tag: TagListItem) {
    const active = selectedTagId === tag.id;
    return (
      <button
        key={tag.id}
        type="button"
        role="option"
        aria-selected={active}
        className={cn(
          mx(styles, "tag-manager-tag"),
          active && mx(styles, "is-active"),
        )}
        onClick={() => selectTag(tag.id)}
      >
        <span className={mx(styles, "tag-manager-tag-label")}>{tag.label}</span>
        <span className={mx(styles, "tag-manager-tag-count")}>
          {t("wordCount", { count: tag.count })}
        </span>
      </button>
    );
  }

  function renderWordRow(word: VocabularyWordRow) {
    const member = wordHasTag(word, selectedTagId);
    const selectable = isWordSelectableForTagOperation(
      word,
      selectedTagId,
      operation,
    );
    const selected = selectable && selectedWordIds.has(word.id);
    const meaning = primaryMeaningText(word.meanings);
    return (
      <label
        key={word.id}
        className={cn(
          mx(styles, "tag-manager-word"),
          member && mx(styles, "is-member"),
          selected && mx(styles, "is-selected"),
          !selectable && mx(styles, "is-disabled"),
        )}
      >
        <input
          type="checkbox"
          className={mx(styles, "tag-manager-word-check")}
          checked={selected}
          disabled={!selectable}
          aria-label={word.word}
          onChange={() => toggleWord(word)}
        />
        <span className={mx(styles, "tag-manager-word-copy")}>
          <span className={mx(styles, "tag-manager-word-title")}>
            {word.word}
          </span>
          {meaning ? (
            <span className={mx(styles, "tag-manager-word-meta")}>
              {meaning}
            </span>
          ) : null}
        </span>
      </label>
    );
  }

  function renderWordSection(options: {
    id: string;
    title: string;
    words: VocabularyWordRow[];
    sectionOp: TagManagerOperation;
    emptyLabel: string;
    emptySearchLabel: string;
  }) {
    const {
      id,
      title,
      words: sectionWords,
      sectionOp,
      emptyLabel,
      emptySearchLabel,
    } = options;
    const selectable = sectionWords.filter((word) =>
      isWordSelectableForTagOperation(word, selectedTagId, operation),
    );
    const sectionLocked = operation !== null && operation !== sectionOp;
    const canSelect =
      !sectionLocked && selectable.length > 0 && (operation === null || operation === sectionOp);
    const allSelected =
      canSelect &&
      selectable.length > 0 &&
      selectable.every((word) => selectedWordIds.has(word.id));

    return (
      <section
        className={mx(styles, "tag-manager-word-section")}
        aria-labelledby={id}
      >
        <div className={mx(styles, "tag-manager-word-section-head")}>
          <div className={mx(styles, "tag-manager-word-section-title-row")}>
            <h3 id={id} className={mx(styles, "tag-manager-word-section-title")}>
              {title}
            </h3>
            <span className={mx(styles, "tag-manager-word-section-count")}>
              {t("sectionCount", { count: sectionWords.length })}
            </span>
          </div>
          {sectionWords.length > 0 ? (
            <label
              className={cn(
                mx(styles, "tag-manager-select-all"),
                !canSelect && mx(styles, "is-disabled"),
              )}
            >
              <input
                type="checkbox"
                className={mx(styles, "tag-manager-word-check")}
                checked={allSelected}
                disabled={!canSelect}
                onChange={() => toggleSection(sectionWords, sectionOp)}
              />
              {t("selectSection")}
            </label>
          ) : null}
        </div>

        {sectionWords.length === 0 ? (
          <p className={mx(styles, "tag-manager-section-empty")}>
            {searchActive ? emptySearchLabel : emptyLabel}
          </p>
        ) : (
          <div className={mx(styles, "tag-manager-word-rows")}>
            {sectionWords.map(renderWordRow)}
          </div>
        )}
      </section>
    );
  }

  const loading = wordsQuery.isLoading || customTagsQuery.isLoading;

  const activeTagList =
    tagSource === "custom" ? customTagOptions : standardTagOptions;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[min(90dvh,56rem)] w-[min(calc(100%-1.25rem),80rem)]",
          "max-w-none sm:max-w-none",
          "flex-col gap-3 overflow-hidden p-4 sm:gap-4 sm:p-5",
        )}
        showCloseButton
      >
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Tags
              className="size-4"
              style={{ color: "var(--module-vocab-fg)" }}
            />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={mx(styles, "tag-manager")}>
          <div className={mx(styles, "tag-manager-layout")}>
            <aside
              className={mx(styles, "tag-manager-tags")}
              aria-label={t("tagsHeading")}
            >
              <div
                className={mx(styles, "tag-manager-source-tabs")}
                role="tablist"
                aria-label={t("tagsHeading")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tagSource === "standard"}
                  className={cn(
                    mx(styles, "tag-manager-source-tab"),
                    tagSource === "standard" && mx(styles, "is-active"),
                  )}
                  onClick={() => selectTagSource("standard")}
                >
                  {t("standardTagsHeading")}
                  <span className={mx(styles, "tag-manager-source-count")}>
                    {standardTagOptions.length}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tagSource === "custom"}
                  className={cn(
                    mx(styles, "tag-manager-source-tab is-custom"),
                    tagSource === "custom" && mx(styles, "is-active"),
                  )}
                  onClick={() => selectTagSource("custom")}
                >
                  {t("customTagsHeading")}
                  <span className={mx(styles, "tag-manager-source-count")}>
                    {customTagOptions.length}
                  </span>
                </button>
              </div>

              <div className={mx(styles, "tag-manager-pane-head")}>
                {tagSource === "standard" ? (
                  <div
                    className={mx(styles, "tag-manager-groups")}
                    role="tablist"
                    aria-label={t("groupsLabel")}
                  >
                    {TAG_MANAGER_GROUPS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={standardGroup === item}
                        className={cn(
                          mx(styles, "tag-manager-group-chip"),
                          standardGroup === item && mx(styles, "is-active"),
                        )}
                        onClick={() => selectStandardGroup(item)}
                      >
                        {tTags(`groups.${item}`)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={mx(styles, "tag-manager-pane-hint")}>
                    {t("customTagsHint")}
                  </p>
                )}
              </div>

              {tagSource === "custom" && customTagOptions.length === 0 ? (
                <p className={mx(styles, "tag-manager-section-empty")}>
                  {t("emptyCustomTags")}
                </p>
              ) : (
                <div
                  className={mx(styles, "tag-manager-list")}
                  role="listbox"
                  aria-label={
                    tagSource === "custom"
                      ? t("customTagsHeading")
                      : t("standardTagsHeading")
                  }
                >
                  {activeTagList.map(renderTagButton)}
                </div>
              )}
            </aside>

            <section
              className={mx(styles, "tag-manager-words")}
              aria-label={t("wordsHeading", { tag: selectedTagLabel })}
            >
              <div className={mx(styles, "tag-manager-pane-head")}>
                <div className={mx(styles, "tag-manager-words-title-row")}>
                  <h2 className={mx(styles, "tag-manager-selected-title")}>
                    {selectedTagLabel}
                  </h2>
                  {selectedKind ? (
                    <span
                      className={cn(
                        mx(styles, "tag-manager-kind-badge"),
                        selectedKind === "custom" && mx(styles, "is-custom"),
                      )}
                    >
                      {selectedKind === "custom"
                        ? t("kindCustom")
                        : t("kindStandard")}
                    </span>
                  ) : null}
                </div>
                <div className={mx(styles, "tag-manager-toolbar")}>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchPlaceholder")}
                  />
                </div>
              </div>

              {loading ? (
                <p className={mx(styles, "tag-manager-empty")}>
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  {t("loading")}
                </p>
              ) : words.length === 0 ? (
                <p className={mx(styles, "tag-manager-empty")}>
                  {t("emptyBank")}
                </p>
              ) : (
                <div className={mx(styles, "tag-manager-word-scroll")}>
                  {renderWordSection({
                    id: "tag-manager-assigned",
                    title: t("assignedHeading"),
                    words: assignedWords,
                    sectionOp: "remove",
                    emptyLabel: t("emptyAssigned"),
                    emptySearchLabel: t("emptyAssignedSearch"),
                  })}
                  {renderWordSection({
                    id: "tag-manager-other",
                    title: t("otherHeading"),
                    words: otherWords,
                    sectionOp: "add",
                    emptyLabel: t("emptyOther"),
                    emptySearchLabel: t("emptyOtherSearch"),
                  })}
                </div>
              )}
            </section>
          </div>

          <div className={mx(styles, "tag-manager-footer")}>
            <div className={mx(styles, "tag-manager-selection")}>
              <p>{t("selected", { count: selectedCount })}</p>
              <p className={mx(styles, "tag-manager-selection-breakdown")}>
                {operation === "add"
                  ? t("modeHintAdd")
                  : operation === "remove"
                    ? t("modeHintRemove")
                    : t("modeHintIdle")}
              </p>
            </div>
            <div className={mx(styles, "tag-manager-actions")}>
              {selectedCount > 0 && operation ? (
                <Button type="button" disabled={pending} onClick={runOperation}>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {operation === "add"
                    ? t("applyAdd", { count: selectedCount })
                    : t("applyRemove", { count: selectedCount })}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
