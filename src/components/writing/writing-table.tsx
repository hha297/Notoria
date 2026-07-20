"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WritingRowActions } from "@/components/writing/writing-row-actions";
import { getWritingListMeta } from "@/lib/writing/content";

export type WritingListItem = {
  id: string;
  title: string;
  content: unknown;
  updatedAt: string;
};

type SortOption = "updated:desc" | "updated:asc" | "title:asc" | "title:desc";

type WritingTableProps = {
  documents: WritingListItem[];
};

export function WritingTable({ documents }: WritingTableProps) {
  const t = useTranslations("writing");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated:desc");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = documents.filter((document) => {
      if (!query) return true;
      return document.title.toLowerCase().includes(query);
    });

    result.sort((a, b) => {
      if (sort.startsWith("title")) {
        const comparison = a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
        return sort === "title:asc" ? comparison : -comparison;
      }

      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sort === "updated:asc" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [documents, search, sort]);

  return (
    <div className="space-y-8">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full sm:h-8 sm:max-w-sm"
          />
          <Select
            value={sort}
            onValueChange={(value) => value && setSort(value as SortOption)}
          >
            <SelectTrigger
              size="sm"
              className="h-10 w-full sm:h-8 sm:w-auto sm:min-w-45"
            >
              <SelectValue>
                {sort === "updated:desc"
                  ? t("sortUpdatedDesc")
                  : sort === "updated:asc"
                    ? t("sortUpdatedAsc")
                    : sort === "title:asc"
                      ? t("sortTitleAsc")
                      : t("sortTitleDesc")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated:desc">{t("sortUpdatedDesc")}</SelectItem>
              <SelectItem value="updated:asc">{t("sortUpdatedAsc")}</SelectItem>
              <SelectItem value="title:asc">{t("sortTitleAsc")}</SelectItem>
              <SelectItem value="title:desc">{t("sortTitleDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filtered.map((document) => {
                const meta = getWritingListMeta(document.content);
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
                        <Badge variant="secondary">
                          {meta.mode === "question_set"
                            ? t("modes.questionSet")
                            : t("modes.richDocument")}
                        </Badge>
                      </div>
                      <WritingRowActions
                        id={document.id}
                        title={document.title}
                        content={document.content}
                      />
                    </div>
                    {meta.mode === "question_set" && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t("sectionCount", { count: meta.sectionCount })}
                        {" · "}
                        {t("questionCount", { count: meta.questionCount })}
                      </p>
                    )}
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
                <colgroup>
                  <col />
                  <col className="w-[9rem]" />
                  <col className="w-[7rem]" />
                  <col className="w-[7rem]" />
                  <col className="w-[9rem]" />
                  <col className="w-[8.5rem]" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{t("columns.title")}</th>
                    <th>{t("columns.mode")}</th>
                    <th className="text-center">{t("columns.sections")}</th>
                    <th className="text-center">{t("columns.questions")}</th>
                    <th>{t("columns.updated")}</th>
                    <th>
                      <span className="sr-only">{t("columns.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((document) => {
                    const meta = getWritingListMeta(document.content);
                    return (
                      <tr key={document.id}>
                        <td className="min-w-0">
                          <Link
                            href={`/writing/${document.id}`}
                            className="block truncate font-semibold text-ink underline-offset-4 hover:underline"
                          >
                            {document.title}
                          </Link>
                        </td>
                        <td>
                          <Badge variant="secondary" className="max-w-full truncate">
                            {meta.mode === "question_set"
                              ? t("modes.questionSet")
                              : t("modes.richDocument")}
                          </Badge>
                        </td>
                        <td className="text-center text-muted-foreground">
                          {meta.mode === "question_set"
                            ? meta.sectionCount
                            : "—"}
                        </td>
                        <td className="text-center text-muted-foreground">
                          {meta.mode === "question_set"
                            ? meta.questionCount
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(document.updatedAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td>
                          <WritingRowActions
                            id={document.id}
                            title={document.title}
                            content={document.content}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
