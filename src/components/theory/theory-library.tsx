"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Clock, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import {
  FolderEmptyState,
  FolderGrid,
  FolderWorkspace,
} from "@/components/folders/folder-workspace";
import { MoveItemButton } from "@/components/folders/move-item-button";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { sectionCreateHref } from "@/lib/folders/paths";
import { childrenOf, folderMatchesQuery, itemsInFolder } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";
import {
  THEORY_CATEGORIES,
  isKnownTheoryCategory,
  type TheoryListItem,
} from "@/lib/theory/content";
import { cn } from "@/lib/utils";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type TheoryLibraryProps = {
  notes: TheoryListItem[];
  folders: FolderListItem[];
  currentFolderId: string | null;
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
  notes,
  folders,
  currentFolderId,
}: TheoryLibraryProps) {
  const t = useTranslations("theory");
  const tFolders = useTranslations("folders");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const createHref = sectionCreateHref("theory", currentFolderId);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const scoped = query ? notes : itemsInFolder(notes, currentFolderId);
    return scoped.filter((note) => {
      if (category !== "all" && note.category !== category) return false;
      if (!query) return true;
      return [note.title, note.description, categoryLabel(note.category, t)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [notes, currentFolderId, search, category, t]);

  const childFolders = childrenOf(folders, currentFolderId);
  const matchingFolders = search.trim()
    ? folders.filter((folder) => folderMatchesQuery(folder, search))
    : childFolders;
  const isEmptyRoot = !currentFolderId && notes.length === 0 && folders.length === 0;
  const isEmptyFolder =
    !search.trim() &&
    category === "all" &&
    childFolders.length === 0 &&
    itemsInFolder(notes, currentFolderId).length === 0;
  const hasFilters = search.trim() !== "" || category !== "all";

  return (
    <PageShell>
      <FolderWorkspace
        section="theory"
        folders={folders}
        currentFolderId={currentFolderId}
        items={notes}
        search={search}
        header={
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <PageHeader
              eyebrow={t("eyebrow")}
              title={t("title")}
              highlight={t("highlight")}
              description={t("description")}
            >
              <ShowTutorialButton section="theory" />
              <NewFolderButton />
              <LinkButton href={createHref} data-tutorial="theory-add-note">
                <Plus className="size-4" />
                {t("create")}
              </LinkButton>
            </PageHeader>
          </motion.div>
        }
      >
        {isEmptyRoot || (isEmptyFolder && !hasFilters) ? (
          currentFolderId ? (
            <FolderEmptyState
              title={tFolders("emptyFolder")}
              description={tFolders("emptyFolderDescription")}
            >
              <LinkButton href={createHref} className="mt-5" data-tutorial="theory-add-note">
                <Plus className="size-4" />
                {t("create")}
              </LinkButton>
            </FolderEmptyState>
          ) : (
            <div className="empty-state">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-ink">{t("emptyTitle")}</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {t("emptyDescription")}
              </p>
              <LinkButton href={createHref} className="mt-5" data-tutorial="theory-add-note">
                <Plus className="size-4" />
                {t("createFirst")}
              </LinkButton>
            </div>
          )
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05, ease: EASE }}
              className="space-y-5"
            >
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-10 pl-9 lg:h-9"
                  data-tutorial="theory-search"
                />
              </div>

              <div
                className="flex flex-wrap gap-x-3 gap-y-3"
                data-tutorial="theory-category-filter"
              >
                <FilterPill
                  active={category === "all"}
                  onClick={() => setCategory("all")}
                >
                  {t("filterAll")}
                </FilterPill>
                {THEORY_CATEGORIES.map((item) => (
                  <FilterPill
                    key={item}
                    active={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {t(`categories.${item}`)}
                  </FilterPill>
                ))}
              </div>
            </motion.div>

            <div className="mt-8 space-y-8">
              <FolderGrid />

              <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                hasFilters && matchingFolders.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="empty-state"
                  >
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
                      <BookOpen className="size-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-ink">{t("noResults")}</p>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {t("noResultsDescription")}
                    </p>
                  </motion.div>
                ) : null
              ) : (
                <motion.div
                  key={`${category}:${search}`}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.045, delayChildren: 0.04 },
                    },
                  }}
                  className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                  data-tutorial="theory-note-list"
                >
                  {filtered.map((note) => (
                    <TheoryCard key={note.id} note={note} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </>
        )}
      </FolderWorkspace>
    </PageShell>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 cursor-pointer rounded-full border px-3 text-sm transition-colors duration-200",
        active
          ? "border-accent-lime/50 bg-accent-lime/20 font-medium text-ink"
          : "border-hairline-cloud bg-card text-muted-foreground hover:border-accent-lime/40 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function TheoryCard({ note }: { note: TheoryListItem }) {
  const t = useTranslations("theory");

  return (
    <FolderItemDrag id={note.id}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
        }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18, ease: EASE }}
      >
        <Card className="h-full border-hairline-cloud bg-card ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-accent-lime/40">
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-2">
              <Badge variant="outline" className="w-fit">
                {categoryLabel(note.category, t)}
              </Badge>
              <MoveItemButton
                id={note.id}
                title={note.title}
                folderId={note.folderId}
              />
            </div>
            <Link href={`/theory/${note.id}`} className="block">
              <CardTitle className="text-lg text-ink">{note.title}</CardTitle>
              {note.description ? (
                <CardDescription className="mt-2 line-clamp-3 text-sm leading-relaxed">
                  {note.description}
                </CardDescription>
              ) : null}
            </Link>
          </CardHeader>
          <CardContent className="mt-auto flex items-center gap-3 pb-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {t("readingTime", { minutes: note.readingMinutes })}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {formatDistanceToNow(new Date(note.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </FolderItemDrag>
  );
}
