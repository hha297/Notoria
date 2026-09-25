"use client";

import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { format } from "date-fns";
import { Download, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MultiFilterOptionGroup } from "@/components/filters/multi-filter-select";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ContentImportDialog } from "@/components/content-import/content-import-dialog";
import { VocabularyExportDialog } from "@/components/vocabulary/export-dialog";
import { VocabularyGroup } from "@/components/vocabulary/vocabulary-group";
import { VocabularyQuickEditDialog } from "@/components/vocabulary/vocabulary-quick-edit-dialog";
import { VocabularyToolbar } from "@/components/vocabulary/vocabulary-toolbar";
import { VocabularyViewModeToggle } from "@/components/vocabulary/vocabulary-view-mode-toggle";
import { useInvalidateWorkspaceQueries } from "@/hooks/use-invalidate-workspace-queries";
import { useVocabularyViewMode } from "@/hooks/use-vocabulary-view-mode";
import {
  isMultiFilterActive,
  multiFilterKey,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import {
  filterVocabularyWords,
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
  const router = useRouter();
  const t = useTranslations("vocabulary");
  const tImport = useTranslations("contentImport");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");

  useRegisterShortcutAction("createNew", () => {
    router.push("/vocabulary/new");
  });
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
  const [importOpen, setImportOpen] = useState(false);
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
    return TAG_PICKER_GROUPS.map((group) => ({
      label: tTags(`groups.${group}`),
      options: BUILTIN_TAG_GROUPS[group].map((tag) => ({
        value: tag.id,
        label: tTags(`${group}.${tag.id}`),
      })),
    }));
  }, [tTags]);

  const customTagFilterOptions = useMemo(
    () =>
      customTagOptions.map((tag) => ({
        value: tag,
        label: getCustomTagName(tag),
      })),
    [customTagOptions],
  );

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

  const actions = (
    <>
      <ShowTutorialButton section="vocabulary" />
      <Button
        type="button"
        variant="outline"
        className="route-quiet-action"
        data-route-action="vocab"
        onClick={() => setImportOpen(true)}
      >
        <Upload className="size-4" />
        {tImport("button")}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="route-quiet-action"
        data-route-action="vocab"
        onClick={() => setExportOpen(true)}
        disabled={filteredWords.length === 0}
        title={filteredWords.length === 0 ? t("export.empty") : undefined}
      >
        <Download className="size-4" />
        {t("export.button")}
      </Button>
      <LinkButton href="/vocabulary/new" data-tutorial="vocab-add-word">
        <Plus className="size-4" />
        {t("addWord")}
      </LinkButton>
    </>
  );

  return (
    <PageShell className="vocab-lexicon-shell">
      <div className={mx(featureStyles, "vocab-lexicon writing-atelier flex flex-col gap-10 lg:gap-12")}>
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{workspaceName}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
          <div className="writing-hero-actions">{actions}</div>
        </header>

        <section className="writing-workspace">
          <VocabularyToolbar
            search={search}
            onSearchChange={setSearch}
            partOfSpeechFilter={partOfSpeechFilter}
            onPartOfSpeechFilterChange={setPartOfSpeechFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            tagFilterGroups={tagFilterGroups}
            customTagOptions={customTagFilterOptions}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
            }}
          />
        </section>

        <section className="writing-stage" data-tutorial="vocab-word-list">
          <div className="writing-stage-toolbar">
            <div className="writing-stage-heading">
              <p className="writing-kicker writing-stage-kicker">
                {t("library")}
              </p>
              <p className="writing-stage-count">
                {filtersActive
                  ? t("shownOfTotal", {
                      shown: filteredWords.length,
                      total: words.length,
                    })
                  : t("groupCount", { count: words.length })}
              </p>
            </div>
            <VocabularyViewModeToggle
              value={viewMode}
              onChange={setViewMode}
            />
          </div>
          {filteredWords.length === 0 ? (
            <div className="writing-empty-desk">
              <p className="writing-empty-title">{t("noResults")}</p>
              <p className="writing-brand-lede">{t("noResultsDescription")}</p>
            </div>
          ) : (
            groupedWords.map((group) => (
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
            ))
          )}
        </section>
      </div>

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

      <ContentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        target="vocabulary"
        workspaceId={workspaceId}
      />
    </PageShell>
  );
}
