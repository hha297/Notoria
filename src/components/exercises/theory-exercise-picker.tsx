"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, type Locale } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MultiFilterSelect } from "@/components/filters/multi-filter-select";
import { useDateFnsLocale } from "@/hooks/use-date-fns-locale";
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
import {
  checkState,
  folderPathLabel,
  groupTheoryPickerNotes,
  toggleMembers,
  type TheoryPickerFolder,
} from "@/lib/theory-exercises/group-picker";

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
  folderId?: string | null;
};

type TheoryViewMode = "list" | "cards";

const THEORY_PAGE_SIZE = 6;
const THEORY_COLOR_SLOTS = 6;

type TheoryExercisePickerProps = {
  theories: TheoryExerciseCardItem[];
  folders?: TheoryPickerFolder[];
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
  dateLocale: Locale,
) {
  return [
    note.sectionCount > 0 ? t("sections", { count: note.sectionCount }) : null,
    note.estimatedExercises > 0
      ? t("estimatedExercises", { count: note.estimatedExercises })
      : t("limitedExercises"),
    tTheory("readingTime", { minutes: note.readingMinutes }),
    formatDistanceToNow(new Date(note.updatedAt), {
      addSuffix: true,
      locale: dateLocale,
    }),
  ].filter((item): item is string => Boolean(item));
}

export function TheoryExercisePicker({
  theories,
  folders = [],
}: TheoryExercisePickerProps) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");
  const dateLocale = useDateFnsLocale();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<MultiFilterValue>([]);
  const [viewMode, setViewMode] = useState<TheoryViewMode>("list");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState<{
    query: string;
    open: Record<string, boolean>;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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

  const libraryGrouping = useMemo(
    () => groupTheoryPickerNotes(theories, folders),
    [folders, theories],
  );
  const filteredIds = useMemo(
    () => new Set(filtered.map((note) => note.id)),
    [filtered],
  );
  const visibleGroups = useMemo(() => {
    if (libraryGrouping.kind !== "grouped") return [];
    return libraryGrouping.groups
      .map((group) => ({
        ...group,
        notes: group.notes.filter((note) => filteredIds.has(note.id)),
      }))
      .filter((group) => group.notes.length > 0);
  }, [filteredIds, libraryGrouping]);
  const searching = search.trim().length > 0;
  const router = useRouter();

  const hasFilters = search.trim() !== "" || isMultiFilterActive(categories);
  const pageSize = THEORY_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const practiceSelected = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const [primary, ...rest] = ids;
    if (!primary) return;
    const href =
      rest.length > 0
        ? `/exercises/theory/${primary}?also=${encodeURIComponent(rest.join(","))}`
        : `/exercises/theory/${primary}`;
    router.push(href);
  };

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
                onChange={(event) => {
                  const next = event.target.value;
                  setSearch(next);
                  setPage(1);
                  if (!next.trim() && searchOpen) setSearchOpen(null);
                }}
                placeholder={t("searchPlaceholder")}
                className="h-10 pl-9 sm:h-9"
              />
            </div>

            <MultiFilterSelect
              emptyLabel={t("filterCategory")}
              values={categories}
              onChange={(next) => {
                setCategories(next);
                setPage(1);
              }}
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
                    setPage(1);
                    if (searchOpen) setSearchOpen(null);
                  }}
                >
                  {t("clearFilters")}
                </button>
              ) : null}
            </TheoryEmpty>
          ) : libraryGrouping.kind === "grouped" ? (
            <div className="space-y-4">
              {selectedIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                  <span className="text-sm text-ink">
                    {t("folders.selectedCount", { count: selectedIds.size })}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
                    onClick={practiceSelected}
                  >
                    {t("folders.practiceSelected")}
                    <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    {t("folders.clearSelection")}
                  </Button>
                </div>
              ) : null}
              <TheoryGroupedNotes
                groups={visibleGroups}
                viewMode={viewMode}
                searching={searching}
                searchQuery={search}
                expanded={expanded}
                searchOpen={searchOpen}
                selectedIds={selectedIds}
                onExpandedChange={setExpanded}
                onSearchOpenChange={setSearchOpen}
                onSelectedChange={setSelectedIds}
              />
            </div>
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
                        meta={noteMeta(note, t, tTheory, dateLocale)}
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
                        meta={noteMeta(note, t, tTheory, dateLocale)}
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

function TheoryGroupedNotes({
  groups,
  viewMode,
  searching,
  searchQuery,
  expanded,
  searchOpen,
  selectedIds,
  onExpandedChange,
  onSearchOpenChange,
  onSelectedChange,
}: {
  groups: Array<{
    id: string;
    unfiled: boolean;
    path: string[];
    notes: TheoryExerciseCardItem[];
  }>;
  viewMode: TheoryViewMode;
  searching: boolean;
  searchQuery: string;
  expanded: Record<string, boolean>;
  searchOpen: { query: string; open: Record<string, boolean> } | null;
  selectedIds: Set<string>;
  onExpandedChange: (value: Record<string, boolean>) => void;
  onSearchOpenChange: (
    value: { query: string; open: Record<string, boolean> } | null,
  ) => void;
  onSelectedChange: (value: Set<string>) => void;
}) {
  const t = useTranslations("exercises.theory");
  const tTheory = useTranslations("theory");
  const dateLocale = useDateFnsLocale();
  const visibleIds = groups.flatMap((group) => group.notes.map((note) => note.id));
  const allState = checkState(selectedIds, visibleIds);

  const isOpen = (groupId: string) => {
    if (searching) {
      if (searchOpen?.query === searchQuery && groupId in searchOpen.open) {
        return searchOpen.open[groupId];
      }
      return true;
    }
    return Boolean(expanded[groupId]);
  };

  const toggleOpen = (groupId: string) => {
    if (searching) {
      const base =
        searchOpen?.query === searchQuery ? searchOpen.open : {};
      const openNow = groupId in base ? base[groupId] : true;
      onSearchOpenChange({
        query: searchQuery,
        open: { ...base, [groupId]: !openNow },
      });
      return;
    }
    onExpandedChange({ ...expanded, [groupId]: !expanded[groupId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex min-h-10 items-center gap-2">
        <span className="inline-flex size-9 shrink-0 items-center justify-center">
          <SelectionCheckbox
            checked={allState === "all"}
            indeterminate={allState === "some"}
            label={t("folders.selectAll")}
            onChange={(select) =>
              onSelectedChange(toggleMembers(selectedIds, visibleIds, select))
            }
          />
        </span>
        <span className="text-sm font-medium text-ink">{t("folders.selectAll")}</span>
      </div>
      {groups.map((group) => {
        const headingText = group.unfiled
          ? t("folders.unfiled")
          : folderPathLabel(group.path, t("folders.joiner"));
        const open = isOpen(group.id);
        const memberIds = group.notes.map((note) => note.id);
        const groupState = checkState(selectedIds, memberIds);
        return (
          <section key={group.id} className="space-y-3">
            <div className="flex min-h-10 items-center gap-1.5 sm:gap-2">
              <span className="inline-flex size-9 shrink-0 items-center justify-center">
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-expanded={open}
                  aria-label={
                    open
                      ? t("folders.collapse", { name: headingText })
                      : t("folders.expand", { name: headingText })
                  }
                  onClick={() => toggleOpen(group.id)}
                >
                  {open ? (
                    <ChevronDown className="size-4" aria-hidden />
                  ) : (
                    <ChevronRight className="size-4" aria-hidden />
                  )}
                </button>
              </span>
              <span className="inline-flex size-9 shrink-0 items-center justify-center">
                <SelectionCheckbox
                  checked={groupState === "all"}
                  indeterminate={groupState === "some"}
                  label={t("folders.selectGroup", { name: headingText })}
                  onChange={(select) =>
                    onSelectedChange(
                      toggleMembers(selectedIds, memberIds, select),
                    )
                  }
                />
              </span>
              <h3 className="min-w-0 flex-1 text-sm leading-snug font-semibold wrap-anywhere text-pretty text-ink">
                {group.unfiled ? (
                  headingText
                ) : (
                  <FolderPathParts path={group.path} />
                )}
              </h3>
              <span className="shrink-0 self-center text-xs tabular-nums text-muted-foreground">
                {t("folders.count", { count: group.notes.length })}
              </span>
            </div>
            {open ? (
              viewMode === "cards" ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {group.notes.map((note, index) => (
                    <li key={note.id} className="min-w-0">
                      <div className="mb-2">
                        <SelectionCheckbox
                          checked={selectedIds.has(note.id)}
                          indeterminate={false}
                          label={note.title}
                          onChange={(select) =>
                            onSelectedChange(
                              toggleMembers(selectedIds, [note.id], select),
                            )
                          }
                        />
                      </div>
                      <TheoryCard
                        note={note}
                        index={index}
                        slot={index % THEORY_COLOR_SLOTS}
                        label={categoryLabel(note.category, tTheory)}
                        meta={noteMeta(note, t, tTheory, dateLocale)}
                        practiceLabel={t("practice")}
                        viewLabel={t("view")}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <ol className="space-y-3">
                  {group.notes.map((note, index) => (
                    <li key={note.id} className="flex min-w-0 items-start gap-3">
                      <div className="pt-6">
                        <SelectionCheckbox
                          checked={selectedIds.has(note.id)}
                          indeterminate={false}
                          label={note.title}
                          onChange={(select) =>
                            onSelectedChange(
                              toggleMembers(selectedIds, [note.id], select),
                            )
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <TheoryListRow
                          note={note}
                          index={index}
                          slot={index % THEORY_COLOR_SLOTS}
                          featured={false}
                          label={categoryLabel(note.category, tTheory)}
                          meta={noteMeta(note, t, tTheory, dateLocale)}
                          practiceLabel={t("practice")}
                          viewLabel={t("view")}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function FolderPathParts({ path }: { path: readonly string[] }) {
  const t = useTranslations("exercises.theory");
  return (
    <span className="inline">
      {path.map((part, index) => (
        <span key={`${index}-${part}`}>
          {index > 0 ? (
            <span
              className="mx-1.5 inline-block text-muted-foreground"
              aria-hidden
            >
              {t("folders.joiner").trim() || "→"}
            </span>
          ) : null}
          <span>{part}</span>
        </span>
      ))}
    </span>
  );
}

function SelectionCheckbox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      aria-label={label}
      aria-checked={indeterminate ? "mixed" : checked}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 shrink-0 rounded-[3px] border border-page-accent-border accent-primary focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    />
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

      <div className="flex min-w-0 flex-wrap items-center gap-1 max-sm:w-full sm:shrink-0 sm:flex-col sm:items-end sm:gap-2 sm:pt-7">
        <Link
          href={`/exercises/theory/${note.id}`}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold max-sm:flex-1 max-sm:justify-center",
            "bg-(--lesson-row-fg) text-(--lesson-row-on) transition-opacity hover:opacity-90",
            "focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none",
          )}
        >
          {practiceLabel}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
        </Link>
        <Link
          href={`/theory/${note.id}`}
          className="inline-flex h-9 items-center px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-(--lesson-row-fg) focus-visible:ring-2 focus-visible:ring-(--lesson-row-fg)/40 focus-visible:outline-none max-sm:flex-1 max-sm:justify-center"
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
