"use client";

import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, ListChecks, Plus, Search, Upload } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { CollapsibleRefine } from "@/components/filters/collapsible-refine";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { ContentImportDialog } from "@/components/content-import/content-import-dialog";
import { WritingCard, type WritingListItem } from "@/components/writing/writing-card";
import { WritingCollections } from "@/components/writing/writing-collections";
import {
  WritingChipPicker,
  WritingFilterChipPicker,
} from "@/components/writing/writing-chip-picker";
import type { WritingMode } from "@/lib/writing/content";
import { childrenOf, folderMatchesQuery, itemsInFolder } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";
import { sectionCreateHref } from "@/lib/folders/paths";
import {
  isMultiFilterActive,
  matchesMultiFilter,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  writingMetaSearchText,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

export type { WritingListItem };

type SortOption =
  | "updated:desc"
  | "updated:asc"
  | "created:desc"
  | "created:asc"
  | "title:asc"
  | "title:desc"
  | "cefr:asc"
  | "cefr:desc";

type GroupByOption = "mode" | "week" | "month";

type WritingTableProps = {
  documents: WritingListItem[];
  folders: FolderListItem[];
  currentFolderId: string | null;
  workspaceId: string;
};

type DocumentGroup = {
  key: string;
  title: string;
  documents: WritingListItem[];
  mode?: WritingMode;
};

const CEFR_ORDER: Record<WritingCefr, number> = {
  a1: 1,
  a2: 2,
  b1: 3,
  b2: 4,
  c1: 5,
  c2: 6,
};

export function WritingTable({
  documents,
  folders,
  currentFolderId,
  workspaceId,
}: WritingTableProps) {
  const router = useRouter();
  const t = useTranslations("writing");
  const tImport = useTranslations("contentImport");
  const tCommon = useTranslations("common");
  const tFolders = useTranslations("folders");
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated:desc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("mode");
  const [cefrFilter, setCefrFilter] = useState<MultiFilterValue>([]);
  const [topicFilter, setTopicFilter] = useState<MultiFilterValue>([]);
  const [formalityFilter, setFormalityFilter] = useState<MultiFilterValue>([]);
  const [learningNotesOnly, setLearningNotesOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const createHref = sectionCreateHref("writing", currentFolderId);
  const learningNoteHref = createHref.includes("?")
    ? `${createHref}&kind=learning_note`
    : `${createHref}?kind=learning_note`;

  useRegisterShortcutAction("createNew", () => {
    router.push(createHref);
  });

  const childFolders = childrenOf(folders, currentFolderId);
  const matchingFolders = search.trim()
    ? folders.filter((folder) => folderMatchesQuery(folder, search))
    : childFolders;
  const hasFilters =
    search.trim() !== "" ||
    learningNotesOnly ||
    isMultiFilterActive(cefrFilter) ||
    isMultiFilterActive(topicFilter) ||
    isMultiFilterActive(formalityFilter);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query
      ? documents
      : itemsInFolder(documents, currentFolderId);
    const result = scoped.filter((document) => {
      const listMeta = document.listMeta;
      const { meta } = listMeta;

      if (learningNotesOnly && meta.kind !== "learning_note") {
        return false;
      }
      if (!matchesMultiFilter(cefrFilter, meta.cefrLevel)) {
        return false;
      }
      if (!matchesMultiFilter(topicFilter, meta.topic)) {
        return false;
      }
      if (!matchesMultiFilter(formalityFilter, meta.formality)) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        document.title,
        document.description ?? "",
        writingMetaSearchText(meta),
        meta.cefrLevel ? tMeta(`cefr.${meta.cefrLevel}`) : "",
        meta.topic
          ? resolveTopicLabel(meta.topic, (key) => tTags(key))
          : "",
        meta.formality
          ? tMeta(`formality.${meta.formality as WritingFormality}`)
          : "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const [sortKey, sortDir] = sort.split(":") as [
      "updated" | "created" | "title" | "cefr",
      "asc" | "desc",
    ];
    const direction = sortDir === "asc" ? 1 : -1;

    return [...result].sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * direction;
      }
      if (sortKey === "cefr") {
        const aOrder = a.listMeta.meta.cefrLevel
          ? CEFR_ORDER[a.listMeta.meta.cefrLevel]
          : 0;
        const bOrder = b.listMeta.meta.cefrLevel
          ? CEFR_ORDER[b.listMeta.meta.cefrLevel]
          : 0;
        return (aOrder - bOrder) * direction;
      }
      const aTime = new Date(
        sortKey === "created" ? a.createdAt : a.updatedAt,
      ).getTime();
      const bTime = new Date(
        sortKey === "created" ? b.createdAt : b.updatedAt,
      ).getTime();
      return (aTime - bTime) * direction;
    });
  }, [
    cefrFilter,
    currentFolderId,
    documents,
    formalityFilter,
    learningNotesOnly,
    search,
    sort,
    tMeta,
    tTags,
    topicFilter,
  ]);

  const groups = useMemo((): DocumentGroup[] => {
    if (groupBy === "mode") {
      const richDocuments: WritingListItem[] = [];
      const questionSets: WritingListItem[] = [];

      for (const document of filtered) {
        if (document.listMeta.mode === "question_set") {
          questionSets.push(document);
        } else {
          richDocuments.push(document);
        }
      }

      return [
        {
          key: "rich_document",
          mode: "rich_document" as const,
          title: t("modes.richDocument"),
          documents: richDocuments,
        },
        {
          key: "question_set",
          mode: "question_set" as const,
          title: t("modes.questionSet"),
          documents: questionSets,
        },
      ].filter((group) => group.documents.length > 0);
    }

    const buckets = new Map<string, DocumentGroup>();

    for (const document of filtered) {
      const date = new Date(document.createdAt);
      let key: string;
      let title: string;

      if (groupBy === "week") {
        const start = startOfWeek(date, { weekStartsOn: 1 });
        const end = endOfWeek(date, { weekStartsOn: 1 });
        key = `week:${format(start, "yyyy-MM-dd")}`;
        title = t("weekOf", {
          date: `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
        });
      } else {
        const start = startOfMonth(date);
        key = `month:${format(start, "yyyy-MM")}`;
        title = format(endOfMonth(date), "MMMM yyyy");
      }

      const existing = buckets.get(key);
      if (existing) {
        existing.documents.push(document);
      } else {
        buckets.set(key, { key, title, documents: [document] });
      }
    }

    return Array.from(buckets.values());
  }, [filtered, groupBy, t]);

  const actions = (
    <>
      <ShowTutorialButton section="writing" />
      <Button
        type="button"
        variant="outline"
        className="route-quiet-action"
        data-route-action="writing"
        onClick={() => setImportOpen(true)}
      >
        <Upload className="size-4" />
        {tImport("button")}
      </Button>
      <LinkButton href={learningNoteHref} variant="outline">
        <Plus className="size-4" />
        {t("learningNote.create")}
      </LinkButton>
      <LinkButton href={createHref} data-tutorial="writing-create">
        <Plus className="size-4" />
        {t("create")}
      </LinkButton>
    </>
  );

  return (
    <PageShell className="writing-atelier-shell">
      <FolderWorkspace
        workspaceId={workspaceId}
        section="writing"
        folders={folders}
        currentFolderId={currentFolderId}
        items={documents}
        search={search}
        showBreadcrumbs={false}
      >
        <div className="writing-atelier flex flex-col gap-10 lg:gap-12">
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("title")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
            <div className="writing-hero-actions">{actions}</div>
          </header>

          <section className="writing-workspace">
            {currentFolderId ? (
              <FolderBreadcrumbs
                section="writing"
                folders={folders}
                currentFolderId={currentFolderId}
              />
            ) : null}
            <div className="writing-spine-tools" data-tutorial="writing-filters">
              <CollapsibleRefine
                routeAction="writing"
                label={tCommon("filters")}
                hideLabel={tCommon("hideFilters")}
                active={
                  learningNotesOnly ||
                  isMultiFilterActive(cefrFilter) ||
                  isMultiFilterActive(formalityFilter) ||
                  isMultiFilterActive(topicFilter) ||
                  groupBy !== "mode" ||
                  sort !== "updated:desc"
                }
                search={
                  <div className="writing-spine-search-wrap">
                    <Search
                      className="writing-spine-search-icon"
                      aria-hidden="true"
                    />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="writing-spine-search"
                      data-tutorial="writing-search"
                    />
                  </div>
                }
              >
                <WritingChipPicker
                  labelId="writing-filter-kind"
                  label={t("learningNote.filterLabel")}
                  value={learningNotesOnly ? "learning_note" : "all"}
                  onChange={(value) =>
                    setLearningNotesOnly(value === "learning_note")
                  }
                  options={[
                    { value: "all", label: t("filterAll") },
                    {
                      value: "learning_note",
                      label: t("learningNote.filter"),
                    },
                  ]}
                />
                <WritingFilterChipPicker
                  labelId="writing-filter-cefr"
                  label={tMeta("cefrLabel")}
                  allLabel={t("filterAll")}
                  values={cefrFilter}
                  onChange={setCefrFilter}
                  options={WRITING_CEFR_LEVELS.map((level) => ({
                    value: level,
                    label: tMeta(`cefr.${level}`),
                  }))}
                />
                <WritingFilterChipPicker
                  labelId="writing-filter-formality"
                  label={tMeta("formalityLabel")}
                  allLabel={t("filterAll")}
                  values={formalityFilter}
                  onChange={setFormalityFilter}
                  options={WRITING_FORMALITY.map((item) => ({
                    value: item,
                    label: tMeta(`formality.${item}`),
                  }))}
                />
                <WritingFilterChipPicker
                  labelId="writing-filter-topic"
                  label={tMeta("topicLabel")}
                  allLabel={t("filterAll")}
                  values={topicFilter}
                  onChange={setTopicFilter}
                  options={WRITING_TOPICS.map((topic) => ({
                    value: topic,
                    label: resolveTopicLabel(topic, (key) => tTags(key)),
                  }))}
                />
                <WritingChipPicker
                  labelId="writing-filter-groupby"
                  label={t("groupBy")}
                  value={groupBy}
                  onChange={(value) => setGroupBy(value as GroupByOption)}
                  options={[
                    { value: "mode", label: t("groupByMode") },
                    { value: "week", label: t("groupByWeek") },
                    { value: "month", label: t("groupByMonth") },
                  ]}
                />
                <WritingChipPicker
                  labelId="writing-filter-sort"
                  label={t("sortBy")}
                  value={sort}
                  onChange={(value) => setSort(value as SortOption)}
                  options={[
                    { value: "updated:desc", label: t("sortUpdatedDesc") },
                    { value: "updated:asc", label: t("sortUpdatedAsc") },
                    { value: "created:desc", label: t("sortCreatedDesc") },
                    { value: "created:asc", label: t("sortCreatedAsc") },
                    { value: "title:asc", label: t("sortTitleAsc") },
                    { value: "title:desc", label: t("sortTitleDesc") },
                    { value: "cefr:asc", label: t("sortCefrAsc") },
                    { value: "cefr:desc", label: t("sortCefrDesc") },
                  ]}
                />
              </CollapsibleRefine>
            </div>
            <WritingCollections currentFolderId={currentFolderId} />
          </section>

          <section className="writing-stage" data-tutorial="writing-list">
            {groups.length > 0 ? (
              <>
                <p className="writing-kicker writing-stage-kicker">{t("library")}</p>
                {groups.map((group) => (
                  <div
                    key={group.key}
                    className="writing-chapter"
                    data-writing-kind={group.mode}
                  >
                    <h2 className="writing-chapter-title">
                      {group.mode === "question_set" ? (
                        <ListChecks className="size-3.5" aria-hidden="true" />
                      ) : group.mode === "rich_document" ? (
                        <FileText className="size-3.5" aria-hidden="true" />
                      ) : null}
                      {group.title}
                    </h2>
                    {group.documents.map((document) => (
                      <WritingCard
                        key={document.id}
                        document={document}
                        workspaceId={workspaceId}
                        variant="entry"
                      />
                    ))}
                  </div>
                ))}
              </>
            ) : hasFilters ? (
              matchingFolders.length === 0 ? (
                <p className="writing-stage-empty">{t("noResults")}</p>
              ) : null
            ) : (
              <div className="writing-empty-desk">
                <p className="writing-empty-title">
                  {currentFolderId ? tFolders("emptyFolder") : t("emptyTitle")}
                </p>
                <p className="writing-brand-lede">
                  {currentFolderId
                    ? tFolders("emptyFolderDescription")
                    : t("emptyDescription")}
                </p>
              </div>
            )}
          </section>
        </div>
      </FolderWorkspace>

      <ContentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        target="writing"
        workspaceId={workspaceId}
      />
    </PageShell>
  );
}
