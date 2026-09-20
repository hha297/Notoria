"use client";

import { format } from "date-fns";
import { Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MultiFilterOptionGroup } from "@/components/filters/multi-filter-select";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { VocabularyExportDialog } from "@/components/vocabulary/export-dialog";
import { VocabularyGroup } from "@/components/vocabulary/vocabulary-group";
import { VocabularyQuickEditDialog } from "@/components/vocabulary/vocabulary-quick-edit-dialog";
import { VocabularyStats } from "@/components/vocabulary/vocabulary-stats";
import { VocabularyToolbar } from "@/components/vocabulary/vocabulary-toolbar";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import { useVocabularyViewMode } from "@/hooks/use-vocabulary-view-mode";
import {
  isMultiFilterActive,
  multiFilterKey,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import {
  filterVocabularyWords,
  getVocabularyStats,
  groupVocabularyWordsByPos,
  isKnownPartOfSpeech,
  sortVocabularyWords,
} from "@/lib/vocabulary/display";
import type { VocabularyExportSourceWord } from "@/lib/vocabulary/export/build-document";
import {
  BUILTIN_TAG_GROUPS,
  getCustomTagName,
  getTagLabel,
  isCustomTagKey,
  TAG_PICKER_GROUPS,
} from "@/lib/vocabulary-tags";
import type {
  VocabularySortDirection,
  VocabularySortField,
  VocabularyWordRow,
} from "@/lib/vocabulary/types";

type VocabularyBankProps = {
  words: VocabularyWordRow[];
  workspaceId: string;
  workspaceName: string;
  language: string;
};

export function VocabularyBank({
  words,
  workspaceId,
  workspaceName,
  language,
}: VocabularyBankProps) {
  const t = useTranslations("vocabulary");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const [search, setSearch] = useState("");
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState<MultiFilterValue>(
    [],
  );
  const [tagFilter, setTagFilter] = useState<MultiFilterValue>([]);
  const [sortField, setSortField] = useState<VocabularySortField>("updated");
  const [sortDirection, setSortDirection] =
    useState<VocabularySortDirection>("desc");
  const [viewMode, setViewMode] = useVocabularyViewMode();
  const [exportOpen, setExportOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabularyWordRow | null>(null);
  const { invalidateVocabulary } = useInvalidateWorkspaceQueries(workspaceId);

  const customTagOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const word of words) {
      for (const tag of word.tags) {
        if (isCustomTagKey(tag.tag)) {
          seen.add(tag.tag);
        }
      }
    }

    return Array.from(seen).sort((a, b) =>
      getCustomTagName(a).localeCompare(getCustomTagName(b)),
    );
  }, [words]);

  const tagFilterGroups = useMemo((): MultiFilterOptionGroup[] => {
    return [
      ...TAG_PICKER_GROUPS.map((group) => ({
        label: tTags(`groups.${group}`),
        options: BUILTIN_TAG_GROUPS[group].map((tag) => ({
          value: tag.id,
          label: tTags(`${group}.${tag.id}`),
        })),
      })),
      ...(customTagOptions.length > 0
        ? [
          {
            label: tTags("groups.custom"),
            options: customTagOptions.map((tag) => ({
              value: tag,
              label: getCustomTagName(tag),
            })),
          },
        ]
        : []),
    ];
  }, [customTagOptions, tTags]);

  const stats = useMemo(() => getVocabularyStats(words), [words]);

  const filteredWords = useMemo(() => {
    return sortVocabularyWords(
      filterVocabularyWords(words, {
        search,
        partOfSpeechFilter,
        tagFilter,
      }),
      sortField,
      sortDirection,
    );
  }, [words, search, partOfSpeechFilter, tagFilter, sortField, sortDirection]);

  const exportWords = useMemo((): VocabularyExportSourceWord[] => {
    return filteredWords.map((word) => {
      const pos = word.partOfSpeech;
      const partOfSpeechLabel = !pos
        ? "—"
        : isKnownPartOfSpeech(pos)
          ? tPos(pos)
          : pos;

      return {
        word: word.word,
        partOfSpeechLabel,
        meanings: word.meanings.map((item) => item.meaning).filter(Boolean),
        tagLabels: word.tags.map((tag) =>
          getTagLabel(tag.tag, (key) => tTags(key)),
        ),
        notes: word.notes ?? "",
        updatedAtLabel: format(new Date(word.updatedAt), "yyyy-MM-dd"),
      };
    });
  }, [filteredWords, tPos, tTags]);

  const groupedWords = useMemo(
    () => groupVocabularyWordsByPos(filteredWords),
    [filteredWords],
  );

  const filtersActive =
    Boolean(search.trim()) ||
    isMultiFilterActive(partOfSpeechFilter) ||
    isMultiFilterActive(tagFilter);

  const sortValue = `${sortField}:${sortDirection}`;

  return (
    <PageShell className="space-y-5">
      <PageHeader
        eyebrow={workspaceName}
        title={t("title")}
        highlight={t("bank")}
        description={t("groupCount", { count: words.length })}
      >
        <ShowTutorialButton section="vocabulary" />
        <Button
          type="button"
          variant="outline"
          onClick={() => setExportOpen(true)}
          disabled={filteredWords.length === 0}
          title={
            filteredWords.length === 0 ? t("export.empty") : undefined
          }
        >
          <Download className="size-4" />
          {t("export.button")}
        </Button>
        <LinkButton href="/vocabulary/new" data-tutorial="vocab-add-word">
          <Plus className="size-4" />
          {t("addWord")}
        </LinkButton>
      </PageHeader>

      <VocabularyStats
        total={stats.total}
        nouns={stats.nouns}
        verbs={stats.verbs}
        recent={stats.recent}
      />

      <div className="space-y-4">
        <VocabularyToolbar
          search={search}
          onSearchChange={setSearch}
          partOfSpeechFilter={partOfSpeechFilter}
          onPartOfSpeechFilterChange={setPartOfSpeechFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          tagFilterGroups={tagFilterGroups}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={(field, direction) => {
            setSortField(field);
            setSortDirection(direction);
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {filtersActive ? (
          <p className="-mt-2 text-xs text-muted-foreground">
            {t("shownOfTotal", {
              shown: filteredWords.length,
              total: words.length,
            })}
          </p>
        ) : null}

        {filteredWords.length === 0 ? (
          <div className="empty-state py-12">
            <p className="font-medium text-ink">{t("noResults")}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t("noResultsDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-4" data-tutorial="vocab-word-list">
            {groupedWords.map((group) => (
              <VocabularyGroup
                key={`${group.key}:${search}:${multiFilterKey(partOfSpeechFilter)}:${multiFilterKey(tagFilter)}:${sortValue}`}
                title={
                  isKnownPartOfSpeech(group.key)
                    ? tPos(group.key)
                    : t("uncategorizedPos")
                }
                posKey={group.key}
                words={group.words}
                viewMode={viewMode}
                workspaceId={workspaceId}
                onEditWord={setEditingWord}
              />
            ))}
          </div>
        )}

        <VocabularyQuickEditDialog
          open={editingWord !== null}
          onOpenChange={(open) => {
            if (!open) setEditingWord(null);
          }}
          language={language}
          workspaceId={workspaceId}
          wordId={editingWord?.id ?? null}
          onSuccess={() => {
            setEditingWord(null);
            invalidateVocabulary();
          }}
        />

        <VocabularyExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          workspaceName={workspaceName}
          words={exportWords}
        />
      </div>
    </PageShell>
  );
}
