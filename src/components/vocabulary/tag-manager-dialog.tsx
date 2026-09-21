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
import { vocabularyListQueryOptions } from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import { primaryMeaningText } from "@/lib/vocabulary/synonyms";
import type { VocabularyWordRow } from "@/lib/vocabulary/types";
import {
  countWordsWithTag,
  filterWordsForTagManager,
  isWordSelectableForTagOperation,
  selectionOperationForTag,
  TAG_MANAGER_GROUPS,
  tagManagerTagIds,
  wordHasTag,
  type TagManagerGroup,
} from "@/lib/vocabulary/tag-manager";
import { BUILTIN_TAG_GROUPS, getTagLabel } from "@/lib/vocabulary-tags";

type TagManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialGroup?: TagManagerGroup;
};

const EMPTY_WORDS: VocabularyWordRow[] = [];

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
  const [group, setGroup] = useState<TagManagerGroup>(initialGroup);
  const [selectedTagId, setSelectedTagId] = useState<string>(
    () => tagManagerTagIds(initialGroup)[0] ?? "everyday_life",
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
  const words = wordsQuery.data ?? EMPTY_WORDS;

  function resetManagerState(nextGroup: TagManagerGroup = initialGroup) {
    setGroup(nextGroup);
    setSelectedTagId(tagManagerTagIds(nextGroup)[0] ?? "everyday_life");
    setSearch("");
    setSelectedWordIds(new Set());
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetManagerState(initialGroup);
    }
    onOpenChange(nextOpen);
  }

  function selectGroup(nextGroup: TagManagerGroup) {
    setGroup(nextGroup);
    setSelectedTagId(tagManagerTagIds(nextGroup)[0] ?? "everyday_life");
    setSelectedWordIds(new Set());
  }

  function selectTag(tagId: string) {
    setSelectedTagId(tagId);
    setSelectedWordIds(new Set());
  }

  const tagOptions = useMemo(() => {
    return BUILTIN_TAG_GROUPS[group].map((tag) => ({
      id: tag.id,
      label: getTagLabel(tag.id, (key) => tTags(key)),
      count: countWordsWithTag(words, tag.id),
    }));
  }, [group, tTags, words]);

  const visibleWords = useMemo(
    () =>
      filterWordsForTagManager(words, {
        tagId: selectedTagId,
        search,
      }),
    [words, selectedTagId, search],
  );

  /** Locked by the first selected word: add = no-tag words, remove = tagged words. */
  const operation = useMemo(
    () => selectionOperationForTag(words, selectedWordIds, selectedTagId),
    [words, selectedWordIds, selectedTagId],
  );

  const selectableVisibleWords = useMemo(
    () =>
      visibleWords.filter((word) =>
        isWordSelectableForTagOperation(word, selectedTagId, operation),
      ),
    [visibleWords, selectedTagId, operation],
  );

  const selectedTagLabel = getTagLabel(selectedTagId, (key) => tTags(key));
  const selectedCount = selectedWordIds.size;
  const selectableSelectedCount = selectableVisibleWords.reduce(
    (count, word) => count + (selectedWordIds.has(word.id) ? 1 : 0),
    0,
  );
  const allSelectableVisibleSelected =
    selectableVisibleWords.length > 0 &&
    selectableSelectedCount === selectableVisibleWords.length;
  /** Avoid Select All mixing memberships before the first pick locks the mode. */
  const canSelectVisible = operation !== null && selectableVisibleWords.length > 0;

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

  function toggleSelectVisible() {
    if (!canSelectVisible) return;
    setSelectedWordIds((current) => {
      const next = new Set(current);
      if (allSelectableVisibleSelected) {
        for (const word of selectableVisibleWords) next.delete(word.id);
      } else {
        for (const word of selectableVisibleWords) next.add(word.id);
      }
      return next;
    });
  }

  async function refreshList() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.vocabulary.all(workspaceId),
    });
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-5xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-4" style={{ color: "var(--module-vocab-fg)" }} />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={mx(styles, "tag-manager")}>
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
                aria-selected={group === item}
                className={cn(
                  mx(styles, "tag-manager-group-chip"),
                  group === item && mx(styles, "is-active"),
                )}
                onClick={() => selectGroup(item)}
              >
                {tTags(`groups.${item}`)}
              </button>
            ))}
          </div>

          <div className={mx(styles, "tag-manager-layout")}>
            <aside className={mx(styles, "tag-manager-tags")}>
              <div className={mx(styles, "tag-manager-pane-head")}>
                <p className={mx(styles, "tag-manager-pane-title")}>
                  {t("tagsHeading")}
                </p>
              </div>
              <div className={mx(styles, "tag-manager-list")} role="listbox">
                {tagOptions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    role="option"
                    aria-selected={selectedTagId === tag.id}
                    className={cn(
                      mx(styles, "tag-manager-tag"),
                      selectedTagId === tag.id && mx(styles, "is-active"),
                    )}
                    onClick={() => selectTag(tag.id)}
                  >
                    <span className={mx(styles, "tag-manager-tag-label")}>
                      {tag.label}
                    </span>
                    <span className={mx(styles, "tag-manager-tag-count")}>
                      {t("wordCount", { count: tag.count })}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className={mx(styles, "tag-manager-words")}>
              <div className={mx(styles, "tag-manager-pane-head")}>
                <p className={mx(styles, "tag-manager-pane-title")}>
                  {t("wordsHeading", { tag: selectedTagLabel })}
                </p>
                <div className={mx(styles, "tag-manager-toolbar")}>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchPlaceholder")}
                  />
                </div>
              </div>

              {wordsQuery.isLoading ? (
                <p className={mx(styles, "tag-manager-empty")}>
                  <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                  {t("loading")}
                </p>
              ) : visibleWords.length === 0 ? (
                <p className={mx(styles, "tag-manager-empty")}>
                  {words.length === 0 ? t("emptyBank") : t("emptyFilter")}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 border-b border-hairline-cloud/80 px-3 py-2">
                    <label
                      className={cn(
                        "flex items-center gap-2 text-xs text-muted-foreground",
                        !canSelectVisible && "opacity-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        className={mx(styles, "tag-manager-word-check")}
                        checked={
                          canSelectVisible && allSelectableVisibleSelected
                        }
                        disabled={!canSelectVisible}
                        onChange={toggleSelectVisible}
                      />
                      {t("selectVisible")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {operation
                        ? t("showingSelectable", {
                            selectable: selectableVisibleWords.length,
                            count: visibleWords.length,
                          })
                        : t("showing", { count: visibleWords.length })}
                    </p>
                  </div>
                  <div className={mx(styles, "tag-manager-word-list")}>
                    {visibleWords.map((word) => {
                      const member = wordHasTag(word, selectedTagId);
                      const selectable = isWordSelectableForTagOperation(
                        word,
                        selectedTagId,
                        operation,
                      );
                      const selected =
                        selectable && selectedWordIds.has(word.id);
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
                            onChange={() => toggleWord(word)}
                          />
                          <span className={mx(styles, "tag-manager-word-copy")}>
                            <p className={mx(styles, "tag-manager-word-title")}>
                              {word.word}
                            </p>
                            {meaning ? (
                              <p className={mx(styles, "tag-manager-word-meta")}>
                                {meaning}
                              </p>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>

          <div className={mx(styles, "tag-manager-footer")}>
            <div className={mx(styles, "tag-manager-selection")}>
              <p>{t("selected", { count: selectedCount })}</p>
              {operation ? (
                <p className={mx(styles, "tag-manager-selection-breakdown")}>
                  {operation === "add"
                    ? t("modeHintAdd")
                    : t("modeHintRemove")}
                </p>
              ) : (
                <p className={mx(styles, "tag-manager-selection-breakdown")}>
                  {t("modeHintIdle")}
                </p>
              )}
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
