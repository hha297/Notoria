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
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderEmptyState, FolderGrid, FolderWorkspace } from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WritingCard, type WritingListItem } from "@/components/writing/writing-card";
import {
  getWritingListMeta,
  type WritingMode,
} from "@/lib/writing/content";
import { childrenOf, folderMatchesQuery, itemsInFolder } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";
import { sectionCreateHref } from "@/lib/folders/paths";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  writingMetaSearchText,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";

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

function WritingDocumentGroup({
  title,
  documents,
}: {
  title: string;
  documents: WritingListItem[];
  mode?: WritingMode;
}) {
  const t = useTranslations("writing");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-medium tracking-tight text-ink sm:text-xl">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {t("groupCount", { count: documents.length })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <WritingCard key={document.id} document={document} />
        ))}
      </div>
    </section>
  );
}

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
}: WritingTableProps) {
  const t = useTranslations("writing");
  const tFolders = useTranslations("folders");
  const tMeta = useTranslations("writing.meta");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated:desc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("mode");
  const [cefrFilter, setCefrFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [formalityFilter, setFormalityFilter] = useState<string>("all");
  const createHref = sectionCreateHref("writing", currentFolderId);
  const childFolders = childrenOf(folders, currentFolderId);
  const matchingFolders = search.trim()
    ? folders.filter((folder) => folderMatchesQuery(folder, search))
    : childFolders;
  const hasFilters =
    search.trim() !== "" ||
    cefrFilter !== "all" ||
    topicFilter !== "all" ||
    formalityFilter !== "all";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query
      ? documents
      : itemsInFolder(documents, currentFolderId);
    const result = scoped.filter((document) => {
      const listMeta = getWritingListMeta(document.content);
      const { meta } = listMeta;

      if (cefrFilter !== "all" && meta.cefrLevel !== cefrFilter) {
        return false;
      }
      if (topicFilter !== "all" && meta.topic !== topicFilter) {
        return false;
      }
      if (formalityFilter !== "all" && meta.formality !== formalityFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        document.title,
        document.description ?? "",
        writingMetaSearchText(meta),
        meta.cefrLevel ? tMeta(`cefr.${meta.cefrLevel}`) : "",
        meta.topic &&
          (WRITING_TOPICS as readonly string[]).includes(meta.topic)
          ? tMeta(`topics.${meta.topic as (typeof WRITING_TOPICS)[number]}`)
          : (meta.topic ?? ""),
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
        const aLevel = getWritingListMeta(a.content).meta.cefrLevel;
        const bLevel = getWritingListMeta(b.content).meta.cefrLevel;
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
  ]);

  const groups = useMemo((): DocumentGroup[] => {
    if (groupBy === "mode") {
      const richDocuments: WritingListItem[] = [];
      const questionSets: WritingListItem[] = [];

      for (const document of filtered) {
        const meta = getWritingListMeta(document.content);
        if (meta.mode === "question_set") {
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

  return (
    <PageShell>
      <FolderWorkspace
        section="writing"
        folders={folders}
        currentFolderId={currentFolderId}
        items={documents}
        search={search}
        header={
          <PageHeader
            eyebrow={t("title")}
            title={t("title")}
            highlight={t("studio")}
            description={t("description")}
          >
            <ShowTutorialButton section="writing" />
            <NewFolderButton />
            <LinkButton href={createHref} data-tutorial="writing-create">
              <Plus className="size-4" />
              {t("create")}
            </LinkButton>
          </PageHeader>
        }
      >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 lg:h-8 lg:max-w-sm"
            data-tutorial="writing-search"
          />

          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap xl:grid-cols-none"
            data-tutorial="writing-filters"
          >
            <Select
              value={cefrFilter}
              onValueChange={(value) => value && setCefrFilter(value)}
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-32"
              >
                <SelectValue>
                  {cefrFilter === "all"
                    ? t("filterCefr")
                    : tMeta(`cefr.${cefrFilter as WritingCefr}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {WRITING_CEFR_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {tMeta(`cefr.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={topicFilter}
              onValueChange={(value) => value && setTopicFilter(value)}
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-32"
              >
                <SelectValue>
                  {topicFilter === "all"
                    ? t("filterTopic")
                    : tMeta(
                      `topics.${topicFilter as (typeof WRITING_TOPICS)[number]}`,
                    )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {WRITING_TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {tMeta(`topics.${topic}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formalityFilter}
              onValueChange={(value) => value && setFormalityFilter(value)}
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-32"
              >
                <SelectValue>
                  {formalityFilter === "all"
                    ? t("filterFormality")
                    : tMeta(`formality.${formalityFilter as WritingFormality}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {WRITING_FORMALITY.map((item) => (
                  <SelectItem key={item} value={item}>
                    {tMeta(`formality.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={groupBy}
              onValueChange={(value) =>
                value && setGroupBy(value as GroupByOption)
              }
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-36"
              >
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
              <SelectTrigger
                size="sm"
                className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-45"
              >
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
        </div>

        <FolderGrid />

        {groups.length === 0 ? (
          hasFilters ? (
            matchingFolders.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted-foreground">{t("noResults")}</p>
              </div>
            ) : null
          ) : childFolders.length === 0 ? (
            <FolderEmptyState
              title={
                currentFolderId ? tFolders("emptyFolder") : t("emptyTitle")
              }
              description={
                currentFolderId
                  ? tFolders("emptyFolderDescription")
                  : t("emptyDescription")
              }
            >
              <LinkButton href={createHref} className="mt-5">
                <Plus className="size-4" />
                {currentFolderId ? t("create") : t("createFirst")}
              </LinkButton>
            </FolderEmptyState>
          ) : null
        ) : (
          <div className="space-y-8" data-tutorial="writing-list">
            {groups.map((group) => (
              <WritingDocumentGroup
                key={group.key}
                mode={group.mode}
                title={group.title}
                documents={group.documents}
              />
            ))}
          </div>
        )}
      </div>
      </FolderWorkspace>
    </PageShell>
  );
}
