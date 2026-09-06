"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Clock, ListTree, Play, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { DescriptionContent } from "@/components/form/description-content";
import {
  isMultiFilterActive,
  matchesMultiFilter,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import {
  THEORY_CATEGORIES,
  isKnownTheoryCategory,
} from "@/lib/theory/content";
import { cn } from "@/lib/utils";

export type TheoryExerciseCardItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Plain note body for search (not shown in the card UI). */
  searchText: string;
  readingMinutes: number;
  estimatedExercises: number;
  sectionCount: number;
  updatedAt: string;
};

type TheoryExercisePickerProps = {
  theories: TheoryExerciseCardItem[];
};

function categoryLabel(
  category: string,
  tTheory: ReturnType<typeof useTranslations<"theory">>,
) {
  return isKnownTheoryCategory(category)
    ? tTheory(`categories.${category}`)
    : category;
}

export function TheoryExercisePicker({ theories }: TheoryExercisePickerProps) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<MultiFilterValue>([]);

  const categoryOptions = useMemo(() => {
    const present = new Set(
      theories.map((note) => note.category.trim()).filter(Boolean),
    );
    const known = THEORY_CATEGORIES.filter((item) => present.has(item)).map(
      (item) => ({
        value: item,
        label: tTheory(`categories.${item}`),
      }),
    );
    const extras = [...present]
      .filter((item) => !(THEORY_CATEGORIES as readonly string[]).includes(item))
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ value: item, label: item }));
    return [...known, ...extras];
  }, [theories, tTheory]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return theories.filter((note) => {
      if (!matchesMultiFilter(categories, note.category)) return false;
      if (!query) return true;
      return [
        note.title,
        note.description,
        note.searchText,
        categoryLabel(note.category, tTheory),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [theories, search, categories, tTheory]);

  const hasFilters = search.trim() !== "" || isMultiFilterActive(categories);

  if (theories.length === 0) {
    return (
      <div className="empty-state">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
          <BookOpen className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium text-ink">{t("emptyTitle")}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {t("emptyDescription")}
        </p>
        <LinkButton href="/theory/new" className="mt-5">
          <Plus className="size-4" />
          {t("emptyCta")}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 pl-9 lg:h-9"
          />
        </div>

        <MultiFilterSelect
          emptyLabel={t("filterCategory")}
          values={categories}
          onChange={setCategories}
          triggerClassName="h-10 w-full min-w-0 sm:h-9 lg:w-auto lg:min-w-36"
          options={categoryOptions}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
            <BookOpen className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-ink">{t("noResults")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("noResultsDescription")}
          </p>
          {hasFilters ? (
            <button
              type="button"
              className="mt-4 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
              onClick={() => {
                setSearch("");
                setCategories([]);
              }}
            >
              {t("clearFilters")}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => {
            const label = categoryLabel(note.category, tTheory);

            return (
              <article
                key={note.id}
                className={cn(
                  "group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-hairline-cloud bg-card p-5 transition-all",
                  "hover:border-accent-lime/50 hover:shadow-[0_0_0_1px_rgba(194,239,78,0.35)]",
                )}
              >
                <div className="mb-4 flex shrink-0 items-start justify-between gap-2">
                  <Badge variant="outline" className="w-fit">
                    {label}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    {tTheory("readingTime", { minutes: note.readingMinutes })}
                  </span>
                </div>

                <h3 className="line-clamp-2 min-h-[3.25rem] font-heading text-lg font-medium leading-snug text-ink transition-colors group-hover:text-accent-lime">
                  {note.title}
                </h3>

                <div className="mt-2 min-h-[3.75rem]">
                  {note.description ? (
                    <DescriptionContent
                      value={note.description}
                      clampLines={3}
                      className="text-sm text-muted-foreground"
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
                  {note.sectionCount > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <ListTree className="size-3.5 shrink-0" aria-hidden />
                        <span>{t("sections", { count: note.sectionCount })}</span>
                      </span>
                      <span className="select-none opacity-50" aria-hidden>
                        ·
                      </span>
                    </>
                  ) : null}
                  <span className="inline-flex items-center">
                    {note.estimatedExercises > 0
                      ? t("estimatedExercises", { count: note.estimatedExercises })
                      : t("limitedExercises")}
                  </span>
                  <span className="select-none opacity-50" aria-hidden>
                    ·
                  </span>
                  <span className="inline-flex items-center">
                    {formatDistanceToNow(new Date(note.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link
                    href={`/exercises/theory/${note.id}`}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-background transition-opacity",
                      "hover:opacity-90",
                    )}
                  >
                    <Play className="size-4" />
                    {t("practice")}
                  </Link>
                  <Link
                    href={`/theory/${note.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-hairline-cloud px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-accent-lime/40 hover:text-ink"
                  >
                    {t("view")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
