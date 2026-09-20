"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Clock, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import { FolderWorkspace } from "@/components/folders/folder-workspace";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { WritingCollections } from "@/components/writing/writing-collections";
import { TheoryListLoading } from "@/components/theory/theory-loading";
import { TheoryRowActions } from "@/components/theory/theory-row-actions";
import { DescriptionContent } from "@/components/form/description-content";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { useQuery } from "@tanstack/react-query";
import { sectionCreateHref } from "@/lib/folders/paths";
import { childrenOf, folderMatchesQuery, itemsInFolder } from "@/lib/folders/tree";
import {
  folderListQueryOptions,
  theoryListQueryOptions,
} from "@/lib/query/options";
import {
  THEORY_CATEGORIES,
  isKnownTheoryCategory,
  type TheoryListItem,
} from "@/lib/theory/content";
import {
  isMultiFilterActive,
  matchesMultiFilter,
  toggleMultiFilterValue,
  type MultiFilterValue,
} from "@/lib/filters/multi-select";
import { cn } from "@/lib/utils";

const EMPTY_THEORY_NOTES: TheoryListItem[] = [];

type TheoryLibraryProps = {
  currentFolderId: string | null;
  workspaceId: string;
};

type NoteGroup = {
  key: string;
  title: string;
  notes: TheoryListItem[];
};

function categoryLabel(
  category: string,
  t: ReturnType<typeof useTranslations<"theory">>,
): string {
  return isKnownTheoryCategory(category)
    ? t(`categories.${category}`)
    : category;
}

export function TheoryLibrary({
  currentFolderId,
  workspaceId,
}: TheoryLibraryProps) {
  const t = useTranslations("theory");
  const tFolders = useTranslations("folders");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<MultiFilterValue>([]);
  const createHref = sectionCreateHref("theory", currentFolderId);
  const notesQuery = useQuery(theoryListQueryOptions(workspaceId));
  const foldersQuery = useQuery(folderListQueryOptions(workspaceId, "theory"));
  const notes = notesQuery.data ?? EMPTY_THEORY_NOTES;
  const folders = foldersQuery.data ?? [];
  const isLoading = notesQuery.isPending || foldersQuery.isPending;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query ? notes : itemsInFolder(notes, currentFolderId);
    return scoped.filter((note) => {
      if (!matchesMultiFilter(categories, note.category)) return false;
      if (!query) return true;
      return [note.title, note.description, categoryLabel(note.category, t)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [notes, currentFolderId, search, categories, t]);

  const groups = useMemo((): NoteGroup[] => {
    const buckets = new Map<string, TheoryListItem[]>();
    for (const note of filtered) {
      const key = note.category || "other";
      const existing = buckets.get(key);
      if (existing) existing.push(note);
      else buckets.set(key, [note]);
    }

    const ordered: NoteGroup[] = [];
    for (const category of THEORY_CATEGORIES) {
      const grouped = buckets.get(category);
      if (!grouped?.length) continue;
      ordered.push({
        key: category,
        title: t(`categories.${category}`),
        notes: grouped,
      });
      buckets.delete(category);
    }
    for (const [key, grouped] of buckets) {
      ordered.push({
        key,
        title: categoryLabel(key, t),
        notes: grouped,
      });
    }
    return ordered;
  }, [filtered, t]);

  const childFolders = childrenOf(folders, currentFolderId);
  const matchingFolders = search.trim()
    ? folders.filter((folder) => folderMatchesQuery(folder, search))
    : childFolders;
  const isEmptyRoot =
    !currentFolderId && notes.length === 0 && folders.length === 0;
  const isEmptyFolder =
    !search.trim() &&
    !isMultiFilterActive(categories) &&
    childFolders.length === 0 &&
    itemsInFolder(notes, currentFolderId).length === 0;
  const hasFilters = search.trim() !== "" || isMultiFilterActive(categories);

  if (isLoading) {
    return (
      <PageShell className="writing-atelier-shell theory-atelier-shell">
        <TheoryListLoading />
      </PageShell>
    );
  }

  const actions = (
    <>
      <ShowTutorialButton section="theory" className="writing-quiet-action" />
      <LinkButton href={createHref} data-tutorial="theory-add-note">
        <Plus className="size-4" />
        {isEmptyRoot ? t("createFirst") : t("create")}
      </LinkButton>
    </>
  );

  return (
    <PageShell className="writing-atelier-shell theory-atelier-shell">
      <FolderWorkspace
        workspaceId={workspaceId}
        section="theory"
        folders={folders}
        currentFolderId={currentFolderId}
        items={notes}
        search={search}
        showBreadcrumbs={false}
      >
        <div className="writing-atelier theory-atelier flex flex-col gap-10 lg:gap-12">
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("description")}</p>
            </div>
            <div className="writing-hero-actions">
              {isEmptyRoot ? (
                <>
                  <ShowTutorialButton section="theory" />
                  <NewFolderButton variant="outline" size="sm" />
                  <LinkButton href={createHref} data-tutorial="theory-add-note">
                    <Plus className="size-4" />
                    {t("createFirst")}
                  </LinkButton>
                </>
              ) : (
                actions
              )}
            </div>
          </header>

          {isEmptyRoot ? (
            <div className="writing-empty-desk">
              <p className="writing-empty-title">{t("emptyTitle")}</p>
              <p className="writing-brand-lede">{t("emptyDescription")}</p>
            </div>
          ) : (
            <>
              <section className="writing-workspace">
                {currentFolderId ? (
                  <FolderBreadcrumbs
                    section="theory"
                    folders={folders}
                    currentFolderId={currentFolderId}
                  />
                ) : null}
                <div
                  className="writing-spine-tools"
                  data-tutorial="theory-search"
                >
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
                    />
                  </div>
                </div>
                <div
                  className="theory-filter-row"
                  data-tutorial="theory-category-filter"
                >
                  <FilterPill
                    active={!isMultiFilterActive(categories)}
                    onClick={() => setCategories([])}
                  >
                    {t("filterAll")}
                  </FilterPill>
                  {THEORY_CATEGORIES.map((item) => (
                    <FilterPill
                      key={item}
                      category={item}
                      active={categories.includes(item)}
                      onClick={() =>
                        setCategories(toggleMultiFilterValue(categories, item))
                      }
                    >
                      {t(`categories.${item}`)}
                    </FilterPill>
                  ))}
                </div>
                <WritingCollections currentFolderId={currentFolderId} />
              </section>

              <div
                className="writing-atelier-rule theory-atelier-rule w-full shrink-0 rounded-full"
                aria-hidden="true"
              />

              <section className="writing-stage" data-tutorial="theory-note-list">
                {groups.length > 0 ? (
                  <>
                    <p className="writing-kicker writing-stage-kicker">
                      {t("library")}
                    </p>
                    {groups.map((group) => (
                      <div
                        key={group.key}
                        className="writing-chapter"
                        data-theory-category={group.key}
                      >
                        <h2 className="writing-chapter-title">{group.title}</h2>
                        {group.notes.map((note) => (
                          <TheoryCard
                            key={note.id}
                            note={note}
                            workspaceId={workspaceId}
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
            </>
          )}
        </div>
      </FolderWorkspace>
    </PageShell>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  category,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  category?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-theory-category={category}
      className={cn("theory-filter-pill", active && "is-active")}
    >
      {children}
    </button>
  );
}

function TheoryCard({
  note,
  workspaceId,
}: {
  note: TheoryListItem;
  workspaceId: string;
}) {
  const t = useTranslations("theory");
  const href = `/theory/${note.id}`;

  return (
    <FolderItemDrag id={note.id} className="writing-entry-wrap">
      <article
        className="writing-entry"
        data-theory-category={note.category || undefined}
      >
        <div className="writing-entry-body">
          <h3 className="writing-entry-title">
            <Link
              href={href}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {note.title}
            </Link>
          </h3>
          {note.description?.trim() ? (
            <DescriptionContent
              value={note.description}
              clampLines={2}
              className="writing-entry-excerpt"
            />
          ) : null}
          <p className="writing-kind-facts">
            <span>{categoryLabel(note.category, t)}</span>
            <span aria-hidden="true"> · </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {t("readingTime", { minutes: note.readingMinutes })}
            </span>
            <span aria-hidden="true"> · </span>
            <span>
              {formatDistanceToNow(new Date(note.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </p>
        </div>
        <div className="writing-entry-actions">
          <TheoryRowActions
            id={note.id}
            title={note.title}
            description={note.description}
            folderId={note.folderId}
            workspaceId={workspaceId}
            category={note.category}
            canExport={note.hasExportableContent}
          />
        </div>
      </article>
    </FolderItemDrag>
  );
}
