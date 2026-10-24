"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomTagPicker } from "@/components/vocabulary/custom-tag-picker";
import { VocabularyPagination } from "@/components/vocabulary/vocabulary-pagination";
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
  isTagManagerTagId,
  listTagManagerCustomTagIds,
  partitionWordsByTagMembership,
  TAG_MANAGER_GROUPS,
  tagManagerTagIds,
  tagManagerKindForId,
  wordHasTag,
  type TagManagerKind,
} from "@/lib/vocabulary/tag-manager";
import { getTagLabel } from "@/lib/vocabulary-tags";

const WORD_PAGE_SIZE = 20;
const BULK_CHUNK = 500;
const EMPTY_WORDS: VocabularyWordRow[] = [];
const EMPTY_CUSTOM: string[] = [];

type TagListItem = {
  id: string;
  label: string;
  count: number;
};

type WordListTab = "assigned" | "other";

type TagManagerPageProps = {
  workspaceId: string;
  initialTagId?: string | null;
  backHref?: string;
};

function safeBackHref(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/settings";
  }
  return raw;
}

async function runChunked(
  wordIds: string[],
  tagId: string,
  mode: "add" | "remove",
) {
  let affected = 0;
  for (let i = 0; i < wordIds.length; i += BULK_CHUNK) {
    const chunk = wordIds.slice(i, i + BULK_CHUNK);
    const result =
      mode === "add"
        ? await addTagToVocabularyWords({ tagId, wordIds: chunk })
        : await removeTagFromVocabularyWords({ tagId, wordIds: chunk });
    if (!result.ok) return { ok: false as const, affected };
    affected += result.affected;
  }
  return { ok: true as const, affected };
}

export function TagManagerPage({
  workspaceId,
  initialTagId = null,
  backHref = "/vocabulary",
}: TagManagerPageProps) {
  const t = useTranslations("vocabulary.tagManager");
  const tTags = useTranslations("tags");
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedBack = safeBackHref(backHref);

  const initialKind: TagManagerKind =
    initialTagId && tagManagerKindForId(initialTagId) === "custom"
      ? "custom"
      : "standard";
  const initialSelected =
    initialTagId && isTagManagerTagId(initialTagId) ? initialTagId : null;

  const [system, setSystem] = useState<TagManagerKind>(initialKind);
  const [standardTagId, setStandardTagId] = useState<string | null>(
    initialKind === "standard"
      ? (initialSelected ?? defaultTagManagerTagId())
      : defaultTagManagerTagId(),
  );
  const [customTagId, setCustomTagId] = useState<string | null>(
    initialKind === "custom" ? initialSelected : null,
  );
  const [wordSearch, setWordSearch] = useState("");
  const [wordTab, setWordTab] = useState<WordListTab>("assigned");
  const [page, setPage] = useState(1);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pending, startTransition] = useTransition();

  const wordsQuery = useQuery({
    ...vocabularyListQueryOptions(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const customTagsQuery = useQuery({
    ...workspaceCustomTagsQueryOptions(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const words = wordsQuery.data ?? EMPTY_WORDS;
  const customNames = customTagsQuery.data ?? EMPTY_CUSTOM;

  const customTagIds = useMemo(
    () => listTagManagerCustomTagIds(customNames, words),
    [customNames, words],
  );

  const standardSections = useMemo(() => {
    return TAG_MANAGER_GROUPS.map((group) => ({
      group,
      label: tTags(`groups.${group}`),
      optional: group === "grammar",
      tags: tagManagerTagIds(group).map((id) => ({
        id,
        label: getTagLabel(id, (key) => tTags(key)),
        count: countWordsWithTag(words, id),
      })),
    }));
  }, [tTags, words]);

  const allStandardTags = useMemo(
    () => standardSections.flatMap((section) => section.tags),
    [standardSections],
  );

  const customTags = useMemo<TagListItem[]>(() => {
    return customTagIds.map((id) => ({
      id,
      label: getTagLabel(id, (key) => tTags(key)),
      count: countWordsWithTag(words, id),
    }));
  }, [customTagIds, tTags, words]);

  const selectedTagId =
    system === "standard" ? standardTagId : customTagId;
  const selectedTagLabel = selectedTagId
    ? getTagLabel(selectedTagId, (key) => tTags(key))
    : "";

  const visibleWords = useMemo(() => {
    if (!selectedTagId) return [];
    return filterWordsForTagManager(words, {
      tagId: selectedTagId,
      search: wordSearch,
    });
  }, [words, selectedTagId, wordSearch]);

  const { assigned: assignedWords, other: otherWords } = useMemo(() => {
    if (!selectedTagId) return { assigned: [], other: [] };
    return partitionWordsByTagMembership(visibleWords, selectedTagId);
  }, [visibleWords, selectedTagId]);

  const activeWords = wordTab === "assigned" ? assignedWords : otherWords;
  const totalPages = Math.max(1, Math.ceil(activeWords.length / WORD_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageWords = useMemo(() => {
    const start = (safePage - 1) * WORD_PAGE_SIZE;
    return activeWords.slice(start, start + WORD_PAGE_SIZE);
  }, [activeWords, safePage]);

  const selectedCount = selectedWordIds.size;
  const searchActive = wordSearch.trim().length > 0;
  const loading = wordsQuery.isLoading || customTagsQuery.isLoading;

  useEffect(() => {
    setPage(1);
  }, [selectedTagId, wordTab, wordSearch, system]);

  useEffect(() => {
    if (system !== "standard") return;
    if (!allStandardTags.some((tag) => tag.id === standardTagId)) {
      setStandardTagId(allStandardTags[0]?.id ?? null);
    }
  }, [system, allStandardTags, standardTagId]);

  useEffect(() => {
    if (system !== "custom") return;
    if (customTagId && !customTags.some((tag) => tag.id === customTagId)) {
      setCustomTagId(customTags[0]?.id ?? null);
      return;
    }
    if (!customTagId && customTags[0]) {
      setCustomTagId(customTags[0].id);
    }
  }, [system, customTags, customTagId]);

  function clearSelection() {
    setSelectedWordIds(new Set());
  }

  function switchSystem(next: TagManagerKind) {
    if (next === system) return;
    setSystem(next);
    clearSelection();
    setWordTab("assigned");
    setWordSearch("");
  }

  function selectStandardTag(tagId: string) {
    if (tagId === standardTagId) return;
    setStandardTagId(tagId);
    clearSelection();
  }

  function selectCustomTag(tagId: string) {
    if (tagId === customTagId) return;
    setCustomTagId(tagId);
    clearSelection();
  }

  function selectWordTab(next: WordListTab) {
    if (next === wordTab) return;
    setWordTab(next);
    clearSelection();
  }

  function toggleWord(wordId: string) {
    setSelectedWordIds((current) => {
      const next = new Set(current);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const ids = pageWords.map((word) => word.id);
    if (ids.length === 0) return;
    const allSelected = ids.every((id) => selectedWordIds.has(id));
    setSelectedWordIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
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
    if (!selectedTagId || selectedWordIds.size === 0 || pending) return;
    const mode = wordTab === "assigned" ? "remove" : "add";
    const wordIds = [...selectedWordIds];
    const tagId = selectedTagId;
    const tagLabel = selectedTagLabel;

    startTransition(async () => {
      const result = await runChunked(wordIds, tagId, mode);
      if (!result.ok || result.affected === 0) {
        toast.error(t("error"));
        await refreshList();
        return;
      }
      toast.success(
        mode === "add"
          ? t("added", { count: result.affected, tag: tagLabel })
          : t("removed", { count: result.affected, tag: tagLabel }),
      );
      clearSelection();
      await refreshList();
      router.refresh();
    });
  }

  const allVisibleSelected =
    pageWords.length > 0 &&
    pageWords.every((word) => selectedWordIds.has(word.id));

  return (
    <PageShell className="tag-manager-shell">
      <div
        className={mx(styles, "tm")}
        data-system={system}
        data-has-selection={selectedCount > 0 ? "true" : undefined}
      >
        <header className={cn("writing-hero", mx(styles, "tm-head"))}>
          <Link href={resolvedBack} className={mx(styles, "tm-back")}>
            <ArrowLeft className="size-3.5" strokeWidth={2.25} />
            {resolvedBack.startsWith("/settings")
              ? t("backToSettings")
              : t("backToVocabulary")}
          </Link>
          <p className="writing-kicker">{t("eyebrow")}</p>
          <h1 className="writing-brand-title">{t("title")}</h1>
          <p className="writing-brand-lede">{t("pageDescription")}</p>
        </header>

        <div
          className={mx(styles, "tm-systems")}
          role="tablist"
          aria-label={t("systemsLabel")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={system === "standard"}
            className={cn(
              mx(styles, "tm-system"),
              system === "standard" && mx(styles, "is-active"),
            )}
            onClick={() => switchSystem("standard")}
          >
            <span className={mx(styles, "tm-system-label")}>
              {t("standardSystemTitle")}
            </span>
            <span className={mx(styles, "tm-system-meta")}>
              {t("standardSystemMeta")}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={system === "custom"}
            className={cn(
              mx(styles, "tm-system"),
              system === "custom" && mx(styles, "is-active"),
            )}
            onClick={() => switchSystem("custom")}
          >
            <span className={mx(styles, "tm-system-label")}>
              {t("customSystemTitle")}
            </span>
            <span className={mx(styles, "tm-system-meta")}>
              {t("customSystemMeta", { count: customTags.length })}
            </span>
          </button>
        </div>

        {system === "standard" ? (
          <section
            className={mx(styles, "tm-panel")}
            aria-label={t("standardSystemTitle")}
          >
            <div className={mx(styles, "tm-sections")}>
              {standardSections.map((section) => (
                <div key={section.group} className={mx(styles, "tm-section")}>
                  <div className={mx(styles, "tm-section-head")}>
                    <h3 className={mx(styles, "tm-section-title")}>
                      {section.label}
                    </h3>
                    {section.optional ? (
                      <span className={mx(styles, "tm-section-optional")}>
                        {t("usageOptional")}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={mx(styles, "tm-grid")}
                    role="listbox"
                    aria-label={section.label}
                  >
                    {section.tags.map((tag) => {
                      const active = tag.id === standardTagId;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={cn(
                            mx(styles, "tm-tile"),
                            active && mx(styles, "is-active"),
                          )}
                          onClick={() => selectStandardTag(tag.id)}
                        >
                          <span className={mx(styles, "tm-tile-label")}>
                            {tag.label}
                          </span>
                          <span className={mx(styles, "tm-tile-count")}>
                            {tag.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section
            className={mx(styles, "tm-panel tm-panel-custom")}
            aria-label={t("customSystemTitle")}
          >
            <div className={mx(styles, "tm-custom-block")}>
              <p className={mx(styles, "tm-custom-label")}>
                {t("customPickerLabel")}
              </p>
              <CustomTagPicker
                options={customTags}
                value={customTagId}
                onChange={selectCustomTag}
                placeholder={t("customPickerPlaceholder")}
                searchPlaceholder={t("customSearchPlaceholder")}
                emptyLabel={t("emptyCustomTags")}
                noResultsLabel={t("emptyTagSearch")}
                className={mx(styles, "tm-custom-picker")}
              />
              <p className={mx(styles, "tm-custom-hint")}>
                {t("customTagsHint")}
              </p>
            </div>
          </section>
        )}

        <section
          className={mx(styles, "tm-stage")}
          aria-label={
            selectedTagId
              ? t("wordsHeading", { tag: selectedTagLabel })
              : t("pickTagFirst")
          }
        >
          {!selectedTagId ? (
            <p className={mx(styles, "tm-empty")}>{t("pickTagFirst")}</p>
          ) : (
            <>
              <div className={mx(styles, "tm-stage-bar")}>
                <div className={mx(styles, "tm-stage-identity")}>
                  <h2 className={mx(styles, "tm-stage-title")}>
                    {selectedTagLabel}
                  </h2>
                  <span
                    className={cn(
                      mx(styles, "tm-kind"),
                      system === "custom" && mx(styles, "is-custom"),
                    )}
                  >
                    {system === "custom"
                      ? t("kindCustom")
                      : t("kindStandard")}
                  </span>
                </div>
                <div
                  className={mx(styles, "tm-mode")}
                  role="tablist"
                  aria-label={t("wordTabsLabel")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wordTab === "assigned"}
                    className={cn(
                      mx(styles, "tm-mode-btn"),
                      wordTab === "assigned" && mx(styles, "is-active"),
                    )}
                    onClick={() => selectWordTab("assigned")}
                  >
                    {t("wordTabAssigned")}
                    <em>{assignedWords.length}</em>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wordTab === "other"}
                    className={cn(
                      mx(styles, "tm-mode-btn"),
                      wordTab === "other" && mx(styles, "is-active"),
                    )}
                    onClick={() => selectWordTab("other")}
                  >
                    {t("wordTabOther")}
                    <em>{otherWords.length}</em>
                  </button>
                </div>
              </div>

              <div className={mx(styles, "tm-tools")}>
                <Input
                  value={wordSearch}
                  onChange={(event) => setWordSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className={mx(styles, "tm-word-search")}
                />
                <label
                  className={cn(
                    mx(styles, "tm-select-all"),
                    pageWords.length === 0 && mx(styles, "is-disabled"),
                  )}
                >
                  <input
                    type="checkbox"
                    className={mx(styles, "tm-check")}
                    checked={allVisibleSelected}
                    disabled={pageWords.length === 0}
                    onChange={toggleSelectAllVisible}
                  />
                  {t("selectAllVisible")}
                </label>
                <p className={mx(styles, "tm-scope")}>
                  {searchActive
                    ? t("selectionScopeFiltered")
                    : t("selectionScopePage", {
                        count: pageWords.length,
                        total: activeWords.length,
                      })}
                </p>
              </div>

              {loading ? (
                <p className={mx(styles, "tm-empty")}>
                  <Loader2 className="size-4 animate-spin" />
                  {t("loading")}
                </p>
              ) : words.length === 0 ? (
                <p className={mx(styles, "tm-empty")}>{t("emptyBank")}</p>
              ) : activeWords.length === 0 ? (
                <p className={mx(styles, "tm-empty")}>
                  {wordTab === "assigned"
                    ? searchActive
                      ? t("emptyAssignedSearch")
                      : t("emptyAssigned")
                    : searchActive
                      ? t("emptyOtherSearch")
                      : t("emptyOther")}
                </p>
              ) : (
                <>
                  <ul className={mx(styles, "tm-words")}>
                    {pageWords.map((word) => {
                      const member = wordHasTag(word, selectedTagId);
                      const selected = selectedWordIds.has(word.id);
                      const meaning = primaryMeaningText(word.meanings);
                      return (
                        <li key={word.id}>
                          <label
                            className={cn(
                              mx(styles, "tm-word"),
                              member && mx(styles, "is-member"),
                              selected && mx(styles, "is-selected"),
                            )}
                          >
                            <input
                              type="checkbox"
                              className={mx(styles, "tm-check")}
                              checked={selected}
                              aria-label={word.word}
                              onChange={() => toggleWord(word.id)}
                            />
                            <span className={mx(styles, "tm-word-copy")}>
                              <span className={mx(styles, "tm-word-title")}>
                                {word.word}
                              </span>
                              {meaning ? (
                                <span className={mx(styles, "tm-word-meta")}>
                                  {meaning}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={mx(styles, "tm-pagination")}>
                    <VocabularyPagination
                      page={safePage}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      className={mx(styles, "tm-pager")}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {selectedCount > 0 ? (
          <div className={mx(styles, "tm-dock")} role="region">
            <p className={mx(styles, "tm-dock-copy")}>
              {t("selected", { count: selectedCount })}
            </p>
            <div className={mx(styles, "tm-dock-actions")}>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={clearSelection}
              >
                {t("clearSelection")}
              </Button>
              <Button type="button" disabled={pending} onClick={runOperation}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {wordTab === "assigned"
                  ? t("applyRemove", { count: selectedCount })
                  : t("applyAdd", { count: selectedCount })}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
