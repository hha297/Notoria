"use client";

import Link from "next/link";
import {
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WritingMetaBadges } from "@/components/writing/writing-meta-badges";
import { WritingRowActions } from "@/components/writing/writing-row-actions";
import {
  getWritingListMeta,
  type WritingMode,
} from "@/lib/writing/content";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  writingMetaSearchText,
  type WritingCefr,
  type WritingFormality,
} from "@/lib/writing/meta";

export type WritingListItem = {
  id: string;
  title: string;
  description?: string | null;
  content: unknown;
  createdAt: string;
  updatedAt: string;
};

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
  mode,
}: {
  title: string;
  documents: WritingListItem[];
  mode?: WritingMode;
}) {
  const t = useTranslations("writing");
  const showQuestionColumns =
    mode === "question_set" ||
    (mode === undefined &&
      documents.some(
        (document) =>
          getWritingListMeta(document.content).mode === "question_set",
      ));

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

      <div className="space-y-3 lg:hidden">
        {documents.map((document) => {
          const listMeta = getWritingListMeta(document.content);
          return (
            <div
              key={document.id}
              className="rounded-xl border border-hairline-cloud bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/writing/${document.id}`}
                    className="block truncate text-base font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {document.title}
                  </Link>
                  {document.description?.trim() ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {document.description.trim()}
                    </p>
                  ) : null}
                  <WritingMetaBadges meta={listMeta.meta} />
                </div>
                <WritingRowActions
                  id={document.id}
                  title={document.title}
                  description={document.description}
                  content={document.content}
                />
              </div>
              {listMeta.mode === "question_set" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("sectionCount", { count: listMeta.sectionCount })}
                  {" · "}
                  {t("questionCount", { count: listMeta.questionCount })}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(document.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="data-table hidden lg:block">
        <table className="table-fixed">
          {showQuestionColumns ? (
            <colgroup>
              <col />
              <col className="w-[7rem]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8.5rem]" />
            </colgroup>
          ) : (
            <colgroup>
              <col />
              <col className="w-[9rem]" />
              <col className="w-[8.5rem]" />
            </colgroup>
          )}
          <thead>
            <tr>
              <th>{t("columns.title")}</th>
              {showQuestionColumns ? (
                <>
                  <th className="text-center">{t("columns.sections")}</th>
                  <th className="text-center">{t("columns.questions")}</th>
                </>
              ) : null}
              <th>{t("columns.updated")}</th>
              <th>
                <span className="sr-only">{t("columns.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const listMeta = getWritingListMeta(document.content);
              return (
                <tr key={document.id}>
                  <td className="min-w-0">
                    <Link
                      href={`/writing/${document.id}`}
                      className="block truncate font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {document.title}
                    </Link>
                    {document.description?.trim() ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {document.description.trim()}
                      </p>
                    ) : null}
                    <div className="mt-1.5">
                      <WritingMetaBadges meta={listMeta.meta} />
                    </div>
                  </td>
                  {showQuestionColumns ? (
                    <>
                      <td className="text-center text-muted-foreground">
                        {listMeta.mode === "question_set"
                          ? listMeta.sectionCount
                          : "—"}
                      </td>
                      <td className="text-center text-muted-foreground">
                        {listMeta.mode === "question_set"
                          ? listMeta.questionCount
                          : "—"}
                      </td>
                    </>
                  ) : null}
                  <td className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(document.updatedAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td>
                    <WritingRowActions
                      id={document.id}
                      title={document.title}
                      description={document.description}
                      content={document.content}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

export function WritingTable({ documents }: WritingTableProps) {
  const t = useTranslations("writing");
  const tMeta = useTranslations("writing.meta");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated:desc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("mode");
  const [cefrFilter, setCefrFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [formalityFilter, setFormalityFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = documents.filter((document) => {
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
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("studio")}
        description={t("description")}
      >
        <LinkButton href="/writing/new">
          <Plus className="size-4" />
          {t("create")}
        </LinkButton>
      </PageHeader>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 lg:h-8 lg:max-w-sm"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap xl:grid-cols-none">
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

        {groups.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="space-y-8">
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
    </PageShell>
  );
}
