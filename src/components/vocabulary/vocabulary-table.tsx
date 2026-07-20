"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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

export type VocabularyWordRow = {
  id: string;
  word: string;
  partOfSpeech: string | null;
  notes?: string | null;
  updatedAt: string;
  meanings: Array<{ meaning: string }>;
  tags: Array<{ id: string; tag: string }>;
};

type SortField = "updated" | "word";
type SortDirection = "asc" | "desc";

type VocabularyTableProps = {
  words: VocabularyWordRow[];
  workspaceName: string;
};

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

  const exportWords = useMemo((): VocabularyExportSourceWord[] => {
    return filteredWords.map((word) => ({
      word: word.word,
      partOfSpeechLabel: formatPartOfSpeech(word.partOfSpeech),
      meanings: word.meanings.map((item) => item.meaning).filter(Boolean),
      tagLabels: word.tags.map((tag) =>
        getTagLabel(tag.tag, (key) => tTags(key)),
      ),
      notes: word.notes ?? "",
      updatedAtLabel: format(new Date(word.updatedAt), "yyyy-MM-dd"),
    }));
  }, [filteredWords, tPos, tTags]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        highlight={t("bank")}
        description={t("formDescription")}
      >
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

      <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-10 lg:h-8 lg:max-w-sm"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
          <Select value={partOfSpeechFilter} onValueChange={(value) => value && setPartOfSpeechFilter(value)}>
            <SelectTrigger size="sm" className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-40">
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

          <Select value={tagFilter} onValueChange={(value) => value && setTagFilter(value)}>
            <SelectTrigger size="sm" className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-35">
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
            <SelectTrigger size="sm" className="h-10 w-full min-w-0 sm:h-8 lg:w-auto lg:min-w-45">
              <SelectValue placeholder={t("sortBy")}>
                {getSortLabel(sortValue)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated:desc">{t("sortUpdated")}</SelectItem>
              <SelectItem value="word:asc">{t("sortWord")} ({t("sortAsc")})</SelectItem>
              <SelectItem value="word:desc">{t("sortWord")} ({t("sortDesc")})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredWords.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted-foreground">{t("noResults")}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredWords.map((word) => {
              const firstMeaning = word.meanings[0]?.meaning;
              const extraMeanings = word.meanings.length - 1;

              return (
                <div
                  key={word.id}
                  className="rounded-xl border border-hairline-cloud bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Link
                        href={`/vocabulary/${word.id}`}
                        className="block truncate text-base font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        {word.word}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatPartOfSpeech(word.partOfSpeech)}
                      </p>
                    </div>
                    <VocabularyRowActions wordId={word.id} word={word.word} />
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {firstMeaning ?? "—"}
                    {extraMeanings > 0 && (
                      <span className="ml-1 text-xs">
                        {t("moreMeanings", { count: extraMeanings })}
                      </span>
                    )}
                  </p>

                  {word.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {word.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {getTagLabel(tag.tag, (key) => tTags(key))}
                        </Badge>
                      ))}
                      {word.tags.length > 4 && (
                        <Badge variant="outline">+{word.tags.length - 4}</Badge>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(word.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="data-table hidden md:block">
            <table className="table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[7rem]" />
              </colgroup>
              <thead>
                <tr>
                  <th>{t("columns.word")}</th>
                  <th>{t("columns.partOfSpeech")}</th>
                  <th>{t("columns.meaning")}</th>
                  <th>{t("columns.tags")}</th>
                  <th>{t("columns.updated")}</th>
                  <th>
                    <span className="sr-only">{t("columns.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((word) => {
                  const firstMeaning = word.meanings[0]?.meaning;
                  const extraMeanings = word.meanings.length - 1;

                  return (
                    <tr key={word.id}>
                      <td>
                        <Link
                          href={`/vocabulary/${word.id}`}
                          className="block truncate font-semibold text-ink underline-offset-4 hover:underline"
                        >
                          {word.word}
                        </Link>
                      </td>
                      <td className="text-muted-foreground">
                        {formatPartOfSpeech(word.partOfSpeech)}
                      </td>
                      <td className="min-w-0 text-muted-foreground">
                        <span className="line-clamp-2">
                          {firstMeaning ?? "—"}
                          {extraMeanings > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {t("moreMeanings", { count: extraMeanings })}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {word.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {getTagLabel(tag.tag, (key) => tTags(key))}
                            </Badge>
                          ))}
                          {word.tags.length > 3 && (
                            <Badge variant="outline">+{word.tags.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(word.updatedAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td>
                        <VocabularyRowActions wordId={word.id} word={word.word} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <VocabularyExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workspaceName={workspaceName}
        words={exportWords}
      />
      </div>
    </div>
  );
}
