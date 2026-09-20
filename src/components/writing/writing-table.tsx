"use client";

import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WritingCard, type WritingListItem } from "@/components/writing/writing-card";
import { WritingCollections } from "@/components/writing/writing-collections";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
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

function sortLabel(sort: SortOption, t: ReturnType<typeof useTranslations>): string {
  switch (sort) {
    case "updated:desc":
      return t("sortUpdatedDesc");
    case "updated:asc":
      return t("sortUpdatedAsc");
    case "created:desc":
      return t("sortCreatedDesc");
    case "created:asc":
      return t("sortCreatedAsc");
    case "title:asc":
      return t("sortTitleAsc");
    case "title:desc":
      return t("sortTitleDesc");
    case "cefr:asc":
      return t("sortCefrAsc");
    case "cefr:desc":
      return t("sortCefrDesc");
  }
}

export function WritingTable({
  documents,
  folders,
  currentFolderId,
  workspaceId,
}: WritingTableProps) {
  const t = useTranslations("writing");
  const tFolders = useTranslations("folders");
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated:desc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("mode");
  const [refineOpen, setRefineOpen] = useState(false);
  const [cefrFilter, setCefrFilter] = useState<MultiFilterValue>([]);
  const [topicFilter, setTopicFilter] = useState<MultiFilterValue>([]);
  const [formalityFilter, setFormalityFilter] = useState<MultiFilterValue>([]);
  const createHref = sectionCreateHref("writing", currentFolderId);
  const childFolders = childrenOf(folders, currentFolderId);
  const matchingFolders = search.trim()
    ? folders.filter((folder) => folderMatchesQuery(folder, search))
    : childFolders;
  const hasFilters =
    search.trim() !== "" ||
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

    result.sort((a, b) => {
      if (sort.startsWith("title")) {
        const comparison = a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
        return sort === "title:asc" ? comparison : -comparison;
      }

      if (sort.startsWith("cefr")) {
        const aLevel = a.listMeta.meta.cefrLevel;
        const bLevel = b.listMeta.meta.cefrLevel;
        const aOrder = aLevel ? CEFR_ORDER[aLevel] : 0;
        const bOrder = bLevel ? CEFR_ORDER[bLevel] : 0;
        return sort === "cefr:asc" ? aOrder - bOrder : bOrder - aOrder;
      }

      if (sort.startsWith("created")) {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sort === "created:asc" ? aTime - bTime : bTime - aTime;
      }

      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sort === "updated:asc" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [
    documents,
    currentFolderId,
    search,
    sort,
    cefrFilter,
    topicFilter,
    formalityFilter,
    tMeta,
    tTags,
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
      <ShowTutorialButton section="writing" className="writing-quiet-action" />
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
              <div className="writing-spine-search-wrap">
                <Search className="writing-spine-search-icon" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="writing-spine-search"
                  data-tutorial="writing-search"
                />
              </div>
              <Button
                type="button"
                variant={refineOpen ? "secondary" : "ghost"}
                size="sm"
                className="writing-refine-toggle"
                aria-expanded={refineOpen}
                onClick={() => setRefineOpen((open) => !open)}
              >
                <SlidersHorizontal className="size-3.5" />
                {t("refine")}
              </Button>
            </div>
            {refineOpen ? (
              <div className="writing-refine">
                <MultiFilterSelect
                  emptyLabel={t("filterCefr")}
                  values={cefrFilter}
                  onChange={setCefrFilter}
                  triggerClassName="writing-refine-control w-full min-w-0"
                  options={WRITING_CEFR_LEVELS.map((level) => ({
                    value: level,
                    label: tMeta(`cefr.${level}`),
                  }))}
                />
                <MultiFilterSelect
                  emptyLabel={t("filterTopic")}
                  values={topicFilter}
                  onChange={setTopicFilter}
                  triggerClassName="writing-refine-control w-full min-w-0"
                  options={WRITING_TOPICS.map((topic) => ({
                    value: topic,
                    label: resolveTopicLabel(topic, (key) => tTags(key)),
                  }))}
                />
                <MultiFilterSelect
                  emptyLabel={t("filterFormality")}
                  values={formalityFilter}
                  onChange={setFormalityFilter}
                  triggerClassName="writing-refine-control w-full min-w-0"
                  options={WRITING_FORMALITY.map((item) => ({
                    value: item,
                    label: tMeta(`formality.${item}`),
                  }))}
                />
                <Select
                  value={groupBy}
                  onValueChange={(value) =>
                    value && setGroupBy(value as GroupByOption)
                  }
                >
                  <SelectTrigger className="writing-refine-control w-full min-w-0">
                    <SelectValue>
                      {groupBy === "mode"
                        ? t("groupByMode")
                        : groupBy === "week"
                          ? t("groupByWeek")
                          : t("groupByMonth")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mode">{t("groupByMode")}</SelectItem>
                    <SelectItem value="week">{t("groupByWeek")}</SelectItem>
                    <SelectItem value="month">{t("groupByMonth")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sort}
                  onValueChange={(value) => value && setSort(value as SortOption)}
                >
                  <SelectTrigger className="writing-refine-control w-full min-w-0">
                    <SelectValue>{sortLabel(sort, t)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated:desc">
                      {t("sortUpdatedDesc")}
                    </SelectItem>
                    <SelectItem value="updated:asc">
                      {t("sortUpdatedAsc")}
                    </SelectItem>
                    <SelectItem value="created:desc">
                      {t("sortCreatedDesc")}
                    </SelectItem>
                    <SelectItem value="created:asc">
                      {t("sortCreatedAsc")}
                    </SelectItem>
                    <SelectItem value="title:asc">{t("sortTitleAsc")}</SelectItem>
                    <SelectItem value="title:desc">{t("sortTitleDesc")}</SelectItem>
                    <SelectItem value="cefr:asc">{t("sortCefrAsc")}</SelectItem>
                    <SelectItem value="cefr:desc">{t("sortCefrDesc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <WritingCollections currentFolderId={currentFolderId} />
          </section>

          <div
            className="writing-atelier-rule w-full shrink-0 rounded-full"
            aria-hidden="true"
          />

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
    </PageShell>
  );
}
