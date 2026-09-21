"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { buildPageList } from "@/lib/vocabulary/display";
import featureStyles from "@/components/style/exercises/theory.module.css";
import { mx } from "@/lib/css-module";
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

type TheoryViewMode = "list" | "cards";

const THEORY_PAGE_SIZE = 6;
const THEORY_COLOR_SLOTS = 6;

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

function noteMeta(
  note: TheoryExerciseCardItem,
  t: ReturnType<typeof useTranslations<"exercises.theory">>,
  tTheory: ReturnType<typeof useTranslations<"theory">>,
) {
  return [
    note.sectionCount > 0 ? t("sections", { count: note.sectionCount }) : null,
    note.estimatedExercises > 0
      ? t("estimatedExercises", { count: note.estimatedExercises })
      : t("limitedExercises"),
    tTheory("readingTime", { minutes: note.readingMinutes }),
    formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true }),
  ].filter((item): item is string => Boolean(item));
}

export function TheoryExercisePicker({ theories }: TheoryExercisePickerProps) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<MultiFilterValue>([]);
  const [viewMode, setViewMode] = useState<TheoryViewMode>("list");
  const [page, setPage] = useState(1);

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
  const pageSize = THEORY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, categories]);

  return (
    <div className="space-y-8" data-exercise="theory">
      <header className={mx(featureStyles, "theory-library-hero relative -mx-1 px-4 py-7 sm:px-6 sm:py-8")}>
        <LibraryDecor />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl space-y-2">
            <p className="text-[0.68rem] font-semibold tracking-[0.2em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h2 className="font-heading text-[1.65rem] font-bold tracking-tight text-pretty text-ink sm:text-[1.95rem]">
              {t("hubTitle")}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink/75 sm:text-[15px]">
              {t("hubDescription")}
            </p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <LinkButton
              href="/theory/new"
              size="sm"
              className="border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
            >
              <Plus className="size-3.5" />
              {t("emptyCta")}
            </LinkButton>
            <LinkButton
              href="/theory"
              variant="outline"
              size="sm"
              className="route-quiet-action"
              data-route-action="theory"
            >
              {t("openLibrary")}
            </LinkButton>
          </div>
        </div>
      </header>

      {theories.length === 0 ? (
        <TheoryEmpty
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        >
          <LinkButton
            href="/theory/new"
            className="mt-5 border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="size-4" />
            {t("emptyCta")}
          </LinkButton>
        </TheoryEmpty>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 pl-9 sm:h-9"
              />
            </div>

            <MultiFilterSelect
              emptyLabel={t("filterCategory")}
              values={categories}
              onChange={setCategories}
              triggerClassName="h-10 w-full min-w-0 sm:h-9 sm:w-auto sm:min-w-36"
              options={categoryOptions}
            />

            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
            />
          </div>

          {filtered.length === 0 ? (
            <TheoryEmpty
              title={t("noResults")}
              description={t("noResultsDescription")}
            >
              {hasFilters ? (
                <button
                  type="button"
                  className="mt-4 text-sm font-medium text-muted-foreground transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-(--lesson-concept)/40 focus-visible:outline-none"
                  onClick={() => {
                    setSearch("");
                    setCategories([]);
                  }}
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </TheoryEmpty>
          ) : viewMode === "cards" ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2">
                {paged.map((note, index) => {
                  const globalIndex = pageStart + index;
                  return (
                    <li key={note.id}>
                      <TheoryCard
                        note={note}
                        index={globalIndex}
                        slot={globalIndex % THEORY_COLOR_SLOTS}
                        label={categoryLabel(note.category, tTheory)}
                        meta={noteMeta(note, t, tTheory)}
                        practiceLabel={t("practice")}
                        viewLabel={t("view")}
                      />
                    </li>
                  );
                })}
              </ul>
              <PickerPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          ) : (
            <>
              <ol className="space-y-3">
                {paged.map((note, index) => {
                  const globalIndex = pageStart + index;
                  const featured = globalIndex === 0 && !hasFilters;
                  return (
                    <li key={note.id}>
                      <TheoryListRow
                        note={note}
                        index={globalIndex}
                        slot={globalIndex % THEORY_COLOR_SLOTS}
                        featured={featured}
                        label={categoryLabel(note.category, tTheory)}
                        meta={noteMeta(note, t, tTheory)}
                        practiceLabel={t("practice")}
                        viewLabel={t("view")}
                      />
                    </li>
                  );
                })}
              </ol>
              <PickerPagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TheoryListRow({
  note,
  index,
  slot,
  featured,
  label,
  meta,
  practiceLabel,
  viewLabel,
}: {
  note: TheoryExerciseCardItem;
  index: number;
  slot: number;
  featured: boolean;
  label: string;
  meta: string[];
  practiceLabel: string;
  viewLabel: string;
}) {
  return (
    <article
      data-theory-category={note.category}
      data-theory-slot={slot}
      data-featured={featured ? "" : undefined}
      className={mx(featureStyles, "theory-library-row group grid gap-4 rounded-md px-4 py-6 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto] sm:items-start sm:gap-x-5 sm:px-5 sm:py-7")}
    >
      <p
        className="font-mono text-[1.7rem] leading-none font-semibold tabular-nums text-(--lesson-row-fg) sm:pt-1 sm:text-[2rem]"
        aria-hidden
      >
        {String(index + 1).padStart(2, "0")}
      </p>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-(--lesson-row-fg) uppercase">
          {label}
        </p>
        <h3
          className={cn(
            "mt-2 font-heading font-bold tracking-tight text-pretty wrap-anywhere text-ink",
            featured ? "text-[1.65rem] sm:text-[1.95rem]" : "text-2xl",
          )}
        >
          <Link
            href={`/exercises/theory/${note.id}`}
            className="rounded-sm text-ink transition-colors group-hover:text-(--lesson-row-fg) hover:text-(--lesson-row-fg) focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none"
          >
            {note.title}
          </Link>
        </h3>
        {note.description ? (
          <DescriptionContent
            value={note.description}
            clampLines={2}
            className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground"
          />
        ) : null}
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {meta.map((item, metaIndex) => (
            <span key={`${note.id}-${metaIndex}`}>
              {metaIndex > 0 ? (
                <span className="mx-1.5 select-none opacity-40" aria-hidden>
                  ·
                </span>
              ) : null}
              {item}
            </span>
          ))}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:flex-col sm:items-end sm:gap-2 sm:pt-7">
        <Link
          href={`/exercises/theory/${note.id}`}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold",
            "bg-(--lesson-row-fg) text-(--lesson-row-on) transition-opacity hover:opacity-90",
            "focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none",
          )}
        >
          {practiceLabel}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </Link>
        <Link
          href={`/theory/${note.id}`}
          className="inline-flex h-9 items-center px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-(--lesson-row-fg) focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none"
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  );
}

function TheoryCard({
  note,
  index,
  slot,
  label,
  meta,
  practiceLabel,
  viewLabel,
}: {
  note: TheoryExerciseCardItem;
  index: number;
  slot: number;
  label: string;
  meta: string[];
  practiceLabel: string;
  viewLabel: string;
}) {
  return (
    <article
      data-theory-category={note.category}
      data-theory-slot={slot}
      className={mx(featureStyles, "theory-library-card group flex h-full flex-col gap-4 rounded-md px-5 py-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="font-mono text-[1.45rem] leading-none font-semibold tabular-nums text-(--lesson-row-fg)"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </p>
        <Link
          href={`/exercises/theory/${note.id}`}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold",
            "bg-(--lesson-row-fg) text-(--lesson-row-on) transition-opacity hover:opacity-90",
            "focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none",
          )}
        >
          {practiceLabel}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </Link>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-(--lesson-row-fg) uppercase">
          {label}
        </p>
        <h3 className="mt-2 font-heading text-xl font-bold tracking-tight text-pretty wrap-anywhere text-ink">
          <Link
            href={`/exercises/theory/${note.id}`}
            className="rounded-sm text-ink transition-colors group-hover:text-(--lesson-row-fg) hover:text-(--lesson-row-fg) focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none"
          >
            {note.title}
          </Link>
        </h3>
        {note.description ? (
          <DescriptionContent
            value={note.description}
            clampLines={3}
            className="mt-2 text-sm leading-relaxed text-muted-foreground"
          />
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="min-w-0 text-xs leading-5 text-muted-foreground">
          {meta.slice(0, 3).map((item, metaIndex) => (
            <span key={`${note.id}-card-${metaIndex}`}>
              {metaIndex > 0 ? (
                <span className="mx-1.5 select-none opacity-40" aria-hidden>
                  ·
                </span>
              ) : null}
              {item}
            </span>
          ))}
        </p>
        <Link
          href={`/theory/${note.id}`}
          className="shrink-0 text-sm font-semibold text-muted-foreground transition-colors hover:text-(--lesson-row-fg) focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none"
        >
          {viewLabel}
        </Link>
      </div>
    </article>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: TheoryViewMode;
  onChange: (value: TheoryViewMode) => void;
}) {
  const t = useTranslations("exercises.theory");

  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        const picked = next[0];
        if (picked === "list" || picked === "cards") {
          onChange(picked);
        }
      }}
      variant="outline"
      spacing={0}
      aria-label={t("viewMode")}
      data-route="exercise"
      className="route-view-toggle ml-auto"
    >
      <ToggleGroupItem
        value="list"
        aria-label={t("viewList")}
        className="route-view-toggle-item"
      >
        <LayoutList className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="cards"
        aria-label={t("viewCards")}
        className="route-view-toggle-item"
      >
        <LayoutGrid className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function PickerPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("exercises.theory");
  const pageItems = buildPageList(page, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        {t("pageOf", { page, totalPages })}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => onPageChange(Math.max(1, page - 1))}
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
              onClick={() => onPageChange(item)}
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
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label={t("nextPage")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function LibraryDecor() {
  return (
    <div aria-hidden className={mx(featureStyles, "theory-decor")}>
      <span className={mx(featureStyles, "theory-blob top-[-30%] left-[-6%] size-40 bg-(--lesson-concept)")} />
      <span className={mx(featureStyles, "theory-blob right-[-8%] bottom-[-40%] size-36 bg-(--lesson-explain)")} />
      <span className={mx(featureStyles, "theory-diamond top-6 right-8 text-(--lesson-insight)")} />
    </div>
  );
}

function TheoryEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={mx(featureStyles, "theory-library-hero relative px-6 py-12 text-center sm:py-14")}>
      <LibraryDecor />
      <div className="relative flex flex-col items-center">
        <div className="mb-4 flex size-12 items-center justify-center border border-(--lesson-concept)/25 bg-(--lesson-concept-soft)/80">
          <BookOpen className="size-5 text-(--lesson-concept)" />
        </div>
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}

export function TheoryExercisePickerLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="space-y-8"
      data-exercise="theory"
    >
      <div className={mx(featureStyles, "theory-library-hero h-36 w-full")} />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-md border border-(--lesson-concept)/25 px-4 py-6 sm:grid-cols-[4.25rem_minmax(0,1fr)] sm:items-center sm:px-5 sm:py-7"
          >
            <div className="h-8 w-12 bg-(--lesson-concept-soft)" />
            <div className="space-y-3">
              <div className="h-3 w-20 bg-(--lesson-explain-soft)" />
              <div className="h-7 w-48 max-w-full bg-muted/80" />
              <div className="h-4 w-full max-w-md bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
