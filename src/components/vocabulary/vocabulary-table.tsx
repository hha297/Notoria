"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUILTIN_TAG_GROUPS,
  getCustomTagName,
  getTagLabel,
  isCustomTagKey,
  PARTS_OF_SPEECH,
  TAG_PICKER_GROUPS,
} from "@/lib/vocabulary-tags";
import { VocabularyExportDialog } from "@/components/vocabulary/export-dialog";
import { VocabularyRowActions } from "@/components/vocabulary/vocabulary-row-actions";
import type { VocabularyExportSourceWord } from "@/lib/vocabulary/export/build-document";
import { vocabularyNotesToPlainText } from "@/lib/vocabulary/notes-content";
import { cn } from "@/lib/utils";

export type VocabularyWordRow = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  notes?: string | null;
  updatedAt: string;
  createdAt?: string;
  meanings: Array<{ meaning: string; isPrimary?: boolean }>;
  tags: Array<{ id: string; tag: string }>;
};

type SortField = "updated" | "word";
type SortDirection = "asc" | "desc";

type VocabularyTableProps = {
  words: VocabularyWordRow[];
  workspaceName: string;
};

const GROUP_PAGE_SIZE = 20;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function buildPageList(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];
  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  }
  return result;
}

const MEANING_PREVIEW_LIMIT = 5;

function wordMeanings(word: VocabularyWordRow) {
  const texts = word.meanings.map((item) => item.meaning).filter(Boolean);
  return {
    shown: texts.slice(0, MEANING_PREVIEW_LIMIT),
    extra: Math.max(0, texts.length - MEANING_PREVIEW_LIMIT),
  };
}

function WordTags({ tags }: { tags: VocabularyWordRow["tags"] }) {
  const tTags = useTranslations("tags");

  if (tags.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="h-5 max-w-full rounded-md border-hairline-cloud bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <span className="truncate">
            {getTagLabel(tag.tag, (key) => tTags(key))}
          </span>
        </Badge>
      ))}
      {tags.length > 3 ? (
        <Badge
          variant="outline"
          className="h-5 rounded-md border-hairline-cloud px-1.5 text-[11px] text-muted-foreground"
        >
          +{tags.length - 3}
        </Badge>
      ) : null}
    </div>
  );
}

function MeaningCell({ word }: { word: VocabularyWordRow }) {
  const t = useTranslations("vocabulary");
  const { shown, extra } = wordMeanings(word);

  if (shown.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <p className="min-w-0 text-sm leading-snug text-muted-foreground">
      {shown.join(" · ")}
      {extra > 0 ? (
        <span className="ml-1 text-xs text-muted-foreground">
          {t("moreMeanings", { count: extra })}
        </span>
      ) : null}
    </p>
  );
}

function VocabularyPosGroup({
  title,
  words,
}: {
  title: string;
  words: VocabularyWordRow[];
}) {
  const t = useTranslations("vocabulary");
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(words.length / GROUP_PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages, words.length]);

  const pageWords = useMemo(() => {
    const start = (page - 1) * GROUP_PAGE_SIZE;
    return words.slice(start, start + GROUP_PAGE_SIZE);
  }, [page, words]);

  const pageItems = buildPageList(page, totalPages);
  const showPagination = words.length > GROUP_PAGE_SIZE;
  const rangeStart = (page - 1) * GROUP_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * GROUP_PAGE_SIZE, words.length);

  return (
    <section className="overflow-hidden rounded-xl border border-hairline-cloud bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline-cloud bg-muted/30 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="h-4 w-1 shrink-0 rounded-full bg-accent-lime"
            aria-hidden
          />
          <h2 className="font-heading text-lg font-medium tracking-tight text-ink sm:text-xl">
            {title}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {showPagination
            ? t("groupPageRange", {
              start: rangeStart,
              end: rangeEnd,
              count: words.length,
            })
            : t("groupCount", { count: words.length })}
        </p>
      </div>

      <div className="space-y-2 p-2 md:hidden">
        {pageWords.map((word) => (
          <div
            key={word.id}
            className="rounded-lg border border-hairline-cloud bg-background p-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/vocabulary/${word.id}`}
                  className="block truncate text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {word.word}
                </Link>
              </div>
              <VocabularyRowActions wordId={word.id} word={word.word} />
            </div>
            <div className="mt-2">
              <MeaningCell word={word} />
            </div>
            {word.tags.length > 0 ? (
              <div className="mt-2">
                <WordTags tags={word.tags} />
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(word.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[40%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-hairline-cloud text-left">
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                {t("columns.word")}
              </th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                {t("columns.meaning")}
              </th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                {t("columns.tags")}
              </th>
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2px] text-muted-foreground">
                {t("columns.updated")}
              </th>
              <th className="px-3 py-2">
                <span className="sr-only">{t("columns.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageWords.map((word) => (
              <tr
                key={word.id}
                className="border-b border-hairline-cloud last:border-b-0 transition-colors hover:bg-muted/40"
              >
                <td className="px-4 py-2.5 align-middle">
                  <Link
                    href={`/vocabulary/${word.id}`}
                    className="block truncate text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
                  >
                    {word.word}
                  </Link>
                </td>
                <td className="min-w-0 px-4 py-2.5 align-middle">
                  <MeaningCell word={word} />
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <WordTags tags={word.tags} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 align-middle text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(word.updatedAt), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-2 py-2.5 align-middle">
                  <VocabularyRowActions wordId={word.id} word={word.word} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="flex flex-col gap-2 border-t border-hairline-cloud px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-xs text-muted-foreground">
            {t("pageOf", { page, totalPages })}
          </p>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label={t("previousPage")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1.5 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 min-w-8 px-2",
                    item === page && "pointer-events-none",
                  )}
                  onClick={() => setPage(item)}
                  aria-label={t("goToPage", { page: item })}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              aria-label={t("nextPage")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function VocabularyTable({ words, workspaceName }: VocabularyTableProps) {
  const t = useTranslations("vocabulary");
  const tTags = useTranslations("tags");
  const tPos = useTranslations("tags.pos");
  const [search, setSearch] = useState("");
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [exportOpen, setExportOpen] = useState(false);

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

  const tagFilterGroups = TAG_PICKER_GROUPS;

  const stats = useMemo(() => {
    const weekAgo = Date.now() - WEEK_MS;
    let nouns = 0;
    let verbs = 0;
    let recent = 0;
    for (const word of words) {
      if (word.partOfSpeech === "noun") nouns += 1;
      if (word.partOfSpeech === "verb") verbs += 1;
      const created = word.createdAt ?? word.updatedAt;
      if (new Date(created).getTime() >= weekAgo) recent += 1;
    }
    return { total: words.length, nouns, verbs, recent };
  }, [words]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = words.filter((word) => {
      if (partOfSpeechFilter !== "all" && word.partOfSpeech !== partOfSpeechFilter) {
        return false;
      }

      if (tagFilter !== "all" && !word.tags.some((tag) => tag.tag === tagFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        word.word,
        ...word.meanings.map((meaning) => meaning.meaning),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    result.sort((a, b) => {
      if (sortField === "word") {
        const comparison = a.word.localeCompare(b.word, undefined, {
          sensitivity: "base",
        });
        return sortDirection === "asc" ? comparison : -comparison;
      }

      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [words, search, partOfSpeechFilter, tagFilter, sortField, sortDirection]);

  function formatPartOfSpeech(pos: string | null) {
    if (!pos) {
      return "—";
    }

    if (PARTS_OF_SPEECH.includes(pos as (typeof PARTS_OF_SPEECH)[number])) {
      return tPos(pos as (typeof PARTS_OF_SPEECH)[number]);
    }

    return pos;
  }

  function getPartOfSpeechFilterLabel(value: string) {
    if (value === "all") {
      return t("filterAll");
    }

    if (PARTS_OF_SPEECH.includes(value as (typeof PARTS_OF_SPEECH)[number])) {
      return tPos(value as (typeof PARTS_OF_SPEECH)[number]);
    }

    return value;
  }

  function getTagFilterLabel(value: string) {
    if (value === "all") {
      return t("filterAll");
    }

    return getTagLabel(value, (key) => tTags(key));
  }

  function getSortLabel(value: string) {
    switch (value) {
      case "updated:desc":
        return t("sortUpdated");
      case "word:asc":
        return `${t("sortWord")} (${t("sortAsc")})`;
      case "word:desc":
        return `${t("sortWord")} (${t("sortDesc")})`;
      default:
        return value;
    }
  }

  const sortValue = `${sortField}:${sortDirection}`;
  const filtersActive =
    Boolean(search.trim()) ||
    partOfSpeechFilter !== "all" ||
    tagFilter !== "all";

  const exportWords = useMemo((): VocabularyExportSourceWord[] => {
    return filteredWords.map((word) => ({
      word: word.word,
      partOfSpeechLabel: formatPartOfSpeech(word.partOfSpeech),
      meanings: word.meanings.map((item) => item.meaning).filter(Boolean),
      tagLabels: word.tags.map((tag) =>
        getTagLabel(tag.tag, (key) => tTags(key)),
      ),
      notes: vocabularyNotesToPlainText(word.notes),
      updatedAtLabel: format(new Date(word.updatedAt), "yyyy-MM-dd"),
    }));
  }, [filteredWords, tPos, tTags]);

  const groupedWords = useMemo(() => {
    const buckets = new Map<string, VocabularyWordRow[]>();

    for (const word of filteredWords) {
      const key =
        word.partOfSpeech &&
          PARTS_OF_SPEECH.includes(
            word.partOfSpeech as (typeof PARTS_OF_SPEECH)[number],
          )
          ? word.partOfSpeech
          : "__none__";

      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(word);
      } else {
        buckets.set(key, [word]);
      }
    }

    const groups: Array<{
      key: string;
      title: string;
      words: VocabularyWordRow[];
    }> = [];

    for (const pos of PARTS_OF_SPEECH) {
      const items = buckets.get(pos);
      if (items?.length) {
        groups.push({
          key: pos,
          title: tPos(pos),
          words: items,
        });
      }
    }

    const uncategorized = buckets.get("__none__");
    if (uncategorized?.length) {
      groups.push({
        key: "__none__",
        title: t("uncategorizedPos"),
        words: uncategorized,
      });
    }

    return groups;
  }, [filteredWords, t, tPos]);

  const statItems = [
    { label: t("stats.total"), value: stats.total },
    { label: tPos("noun"), value: stats.nouns },
    { label: tPos("verb"), value: stats.verbs },
    { label: t("stats.recent"), value: stats.recent },
  ];

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
        >
          <Download className="size-4" />
          {t("export.button")}
        </Button>
        <LinkButton href="/vocabulary/new">
          <Plus className="size-4" />
          {t("addWord")}
        </LinkButton>
      </PageHeader>

      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-hairline-cloud sm:grid-cols-4">
        {statItems.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "bg-card px-4 py-3",
              index % 2 === 1 && "border-l border-hairline-cloud",
              index > 0 && "sm:border-l sm:border-hairline-cloud",
              index >= 2 && "border-t border-hairline-cloud sm:border-t-0",
            )}
          >
            <p className="font-heading text-xl font-medium leading-none text-ink sm:text-2xl">
              {item.value}
            </p>
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-xl border border-hairline-cloud bg-card p-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 border-0 bg-transparent pl-9 shadow-none focus-visible:shadow-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-1.5">
            <Select
              value={partOfSpeechFilter}
              onValueChange={(value) => value && setPartOfSpeechFilter(value)}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-full min-w-0 sm:min-w-36"
              >
                <SelectValue placeholder={t("filterPartOfSpeech")}>
                  {partOfSpeechFilter === "all"
                    ? t("filterPartOfSpeech")
                    : getPartOfSpeechFilterLabel(partOfSpeechFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {PARTS_OF_SPEECH.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {tPos(pos)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={tagFilter}
              onValueChange={(value) => value && setTagFilter(value)}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-full min-w-0 sm:min-w-32"
              >
                <SelectValue placeholder={t("columns.tags")}>
                  {tagFilter === "all"
                    ? t("columns.tags")
                    : getTagFilterLabel(tagFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-80 min-w-56">
                <SelectGroup>
                  <SelectItem value="all">{t("filterAll")}</SelectItem>
                </SelectGroup>
                {tagFilterGroups.map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{tTags(`groups.${group}`)}</SelectLabel>
                    {BUILTIN_TAG_GROUPS[group].map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tTags(`${group}.${tag.id}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                {customTagOptions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{tTags("groups.custom")}</SelectLabel>
                    {customTagOptions.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {getCustomTagName(tag)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            <Select
              value={sortValue}
              onValueChange={(value) => {
                if (!value) return;
                const [field, direction] = value.split(":") as [
                  SortField,
                  SortDirection,
                ];
                setSortField(field);
                setSortDirection(direction);
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-9 w-full min-w-0 sm:min-w-40"
              >
                <SelectValue placeholder={t("sortBy")}>
                  {getSortLabel(sortValue)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated:desc">{t("sortUpdated")}</SelectItem>
                <SelectItem value="word:asc">
                  {t("sortWord")} ({t("sortAsc")})
                </SelectItem>
                <SelectItem value="word:desc">
                  {t("sortWord")} ({t("sortDesc")})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
            <p className="text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedWords.map((group) => (
              <VocabularyPosGroup
                key={`${group.key}:${search}:${partOfSpeechFilter}:${tagFilter}:${sortValue}`}
                title={group.title}
                words={group.words}
              />
            ))}
          </div>
        )}

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
