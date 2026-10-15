"use client";

import { useMemo, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Folder,
  FolderOpen,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DeleteFolderDialog } from "@/components/folders/delete-folder-dialog";
import { FolderNameDialog } from "@/components/folders/folder-name-dialog";
import { NewFolderButton } from "@/components/folders/new-folder-button";
import {
  InboxCaptureDialog,
  type InboxCaptureDraft,
} from "@/components/inbox/inbox-capture-dialog";
import { InboxItemActions } from "@/components/inbox/inbox-item-actions";
import { PageShell } from "@/components/layout/page-shell";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { CollectionViewModeToggle } from "@/components/shared/collection-view-mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import styles from "@/components/style/inbox/inbox.module.css";
import { useCollectionViewMode } from "@/hooks/use-collection-view-mode";
import {
  createFolder,
  deleteFolder,
  renameFolder,
} from "@/lib/actions/folders";
import { mx } from "@/lib/css-module";
import type { FolderListItem } from "@/lib/folders/types";
import {
  filterInboxByFolderScope,
  resolveInboxFolderScope,
  type InboxFolderScope,
} from "@/lib/inbox/scope";
import { cn } from "@/lib/utils";

export type InboxListItem = {
  id: string;
  content: string;
  note: string | null;
  source: string | null;
  status: "unprocessed" | "processed";
  folderId: string | null;
  createdAt: string;
};

type InboxFilter = "unprocessed" | "processed";
type InboxSort = "newest" | "oldest" | "nameAsc" | "nameDesc";
type FolderScope = InboxFolderScope;

const SORT_OPTIONS: InboxSort[] = [
  "newest",
  "oldest",
  "nameAsc",
  "nameDesc",
];

type InboxViewProps = {
  items: InboxListItem[];
  folders: FolderListItem[];
  initialFilter: InboxFilter;
};

function previewText(value: string, max = 160) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function InboxView({
  items,
  folders,
  initialFilter,
}: InboxViewProps) {
  const t = useTranslations("inbox");
  const tf = useTranslations("folders");
  const te = useTranslations("errors");
  const router = useRouter();
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InboxSort>("newest");
  const [folderScope, setFolderScope] = useState<FolderScope>("all");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [editItem, setEditItem] = useState<InboxCaptureDraft | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderListItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FolderListItem | null>(
    null,
  );
  const [viewMode, setViewMode] = useCollectionViewMode("inbox");
  const [isPending, startTransition] = useTransition();

  const folderIds = useMemo(() => folders.map((folder) => folder.id), [folders]);
  const activeFolderScope = resolveInboxFolderScope(folderScope, folderIds);

  const occupiedFolderNames = useMemo(
    () => folders.map((folder) => folder.name),
    [folders],
  );

  const sortLabel = (value: InboxSort) => {
    switch (value) {
      case "oldest":
        return t("sortOldest");
      case "nameAsc":
        return t("sortNameAsc");
      case "nameDesc":
        return t("sortNameDesc");
      case "newest":
      default:
        return t("sortNewest");
    }
  };

  const statusItems = useMemo(
    () => items.filter((item) => item.status === filter),
    [items, filter],
  );

  const folderCounts = useMemo(() => {
    const byFolder = new Map<string, number>();
    let unfiled = 0;
    for (const item of statusItems) {
      if (!item.folderId) {
        unfiled += 1;
        continue;
      }
      byFolder.set(item.folderId, (byFolder.get(item.folderId) ?? 0) + 1);
    }
    return {
      all: statusItems.length,
      unfiled,
      byFolder,
    };
  }, [statusItems]);

  const scopedItems = useMemo(
    () => filterInboxByFolderScope(statusItems, activeFolderScope),
    [statusItems, activeFolderScope],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = scopedItems.filter((item) => {
      if (!query) return true;
      return (
        item.content.toLowerCase().includes(query) ||
        (item.note?.toLowerCase().includes(query) ?? false) ||
        (item.source?.toLowerCase().includes(query) ?? false)
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "nameAsc":
          return a.content.localeCompare(b.content, undefined, {
            sensitivity: "base",
          });
        case "nameDesc":
          return b.content.localeCompare(a.content, undefined, {
            sensitivity: "base",
          });
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return sorted;
  }, [scopedItems, search, sort]);

  const tabCounts = useMemo(
    () => ({
      unprocessed: items.filter((item) => item.status === "unprocessed").length,
      processed: items.filter((item) => item.status === "processed").length,
    }),
    [items],
  );

  const activeFolder =
    activeFolderScope !== "all" && activeFolderScope !== "unfiled"
      ? (folders.find((folder) => folder.id === activeFolderScope) ?? null)
      : null;

  const searchScopeLabel =
    activeFolderScope === "all"
      ? t("scopeAll")
      : activeFolderScope === "unfiled"
        ? t("unfiled")
        : (activeFolder?.name ?? t("scopeAll"));

  const emptyBecauseSearch = visible.length === 0 && search.trim().length > 0;
  const isEmptyLibrary =
    items.length === 0 && folders.length === 0 && !search.trim();
  const isEmptyFolder =
    !emptyBecauseSearch &&
    visible.length === 0 &&
    activeFolderScope !== "all" &&
    scopedItems.length === 0;

  const captureDefaultFolderId =
    activeFolderScope !== "all" && activeFolderScope !== "unfiled"
      ? activeFolderScope
      : null;

  const deleteItemCount = deleteTarget
    ? items.filter((item) => item.folderId === deleteTarget.id).length
    : 0;

  function openCreate() {
    setEditItem(null);
    setCaptureOpen(true);
  }

  function openEdit(item: InboxListItem) {
    setEditItem({
      id: item.id,
      content: item.content,
      note: item.note,
      source: item.source,
      folderId: item.folderId,
    });
    setCaptureOpen(true);
  }

  function handleCaptureOpenChange(next: boolean) {
    setCaptureOpen(next);
    if (!next) setEditItem(null);
  }

  function handleCreateFolder(name: string) {
    startTransition(async () => {
      try {
        await createFolder({ section: "inbox", name, parentId: null });
        toast.success(tf("created"));
        setCreateFolderOpen(false);
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "NAME_TAKEN") {
          toast.error(tf("nameTaken"));
          return;
        }
        toast.error(te("generic"));
      }
    });
  }

  function handleRenameFolder(name: string) {
    if (!renameTarget) return;
    startTransition(async () => {
      try {
        await renameFolder({ id: renameTarget.id, name });
        toast.success(tf("renamed"));
        setRenameTarget(null);
        router.refresh();
      } catch (error) {
        if (error instanceof Error && error.message === "NAME_TAKEN") {
          toast.error(tf("nameTaken"));
          return;
        }
        toast.error(te("generic"));
      }
    });
  }

  function handleDeleteFolder() {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    startTransition(async () => {
      try {
        await deleteFolder(deletedId);
        toast.success(tf("deleted"));
        setDeleteTarget(null);
        if (folderScope === deletedId) setFolderScope("unfiled");
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  function renderMeta(item: InboxListItem, compact = false) {
    return (
      <div className={mx(styles, compact ? "inbox-card-meta-compact" : "inbox-card-meta")}>
        <time dateTime={item.createdAt}>
          {format(new Date(item.createdAt), "MMM d, yyyy")}
        </time>
        {!compact ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </span>
          </>
        ) : null}
        {item.source ? (
          <>
            <span aria-hidden>·</span>
            <span>{t("sourcePrefix", { source: item.source })}</span>
          </>
        ) : null}
        {item.status === "processed" ? (
          <>
            <span aria-hidden>·</span>
            <span className={mx(styles, "inbox-card-badge")}>
              {t("statusProcessed")}
            </span>
          </>
        ) : null}
      </div>
    );
  }

  function renderItem(item: InboxListItem, index: number) {
    const isGrid = viewMode === "cards";
    return (
      <li
        key={item.id}
        data-status={item.status}
        className={mx(styles, isGrid ? "inbox-grid-card" : "inbox-card")}
        data-tutorial={index === 0 ? "inbox-process" : undefined}
      >
        <div className={mx(styles, "inbox-card-row")}>
          <div className={mx(styles, "inbox-card-body")}>
            <p className={mx(styles, isGrid ? "inbox-grid-title" : "inbox-card-title")}>
              {isGrid ? previewText(item.content, 140) : item.content}
            </p>
            {item.note ? (
              <p className={mx(styles, isGrid ? "inbox-grid-note" : "inbox-card-note")}>
                {isGrid ? previewText(item.note, 100) : item.note}
              </p>
            ) : null}
            {renderMeta(item, isGrid)}
          </div>
          <InboxItemActions
            id={item.id}
            status={item.status}
            folderId={item.folderId}
            folders={folders}
            onEdit={() => openEdit(item)}
          />
        </div>
      </li>
    );
  }

  return (
    <PageShell className={mx(styles, "inbox-shell")}>
      <div
        className={cn(
          "writing-atelier inbox-atelier flex flex-col gap-10 lg:gap-12",
          mx(styles, "inbox-atelier"),
        )}
      >
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
          <div className="writing-hero-actions">
            <ShowTutorialButton section="inbox" autoOpenIfIncomplete />
            <NewFolderButton
              variant="outline"
              size="sm"
              routeAction="home"
              onClick={() => setCreateFolderOpen(true)}
            />
            <Button
              type="button"
              data-tutorial="inbox-capture"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              {t("capture")}
            </Button>
          </div>
        </header>

        <>
            <nav
              className={mx(styles, "inbox-folder-rail")}
              aria-label={t("foldersNav")}
              data-tutorial="inbox-folders"
            >
              <div className={mx(styles, "inbox-folder-chips")}>
                {(
                  [
                    ["all", t("scopeAll"), folderCounts.all, Inbox],
                    ["unfiled", t("unfiled"), folderCounts.unfiled, FolderOpen],
                  ] as const
                ).map(([value, label, count, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    className={mx(styles, "inbox-folder-chip")}
                    data-active={activeFolderScope === value || undefined}
                    onClick={() => setFolderScope(value)}
                  >
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    <span className={mx(styles, "inbox-folder-chip-label")}>
                      {label}
                    </span>
                    <span className={mx(styles, "inbox-folder-chip-count")}>
                      {count}
                    </span>
                  </button>
                ))}
                {folders.map((folder) => {
                  const count = folderCounts.byFolder.get(folder.id) ?? 0;
                  const active = activeFolderScope === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className={mx(styles, "inbox-folder-chip-wrap")}
                      data-active={active || undefined}
                    >
                      <button
                        type="button"
                        className={mx(styles, "inbox-folder-chip")}
                        data-active={active || undefined}
                        onClick={() => setFolderScope(folder.id)}
                      >
                        <Folder className="size-3.5 shrink-0" aria-hidden />
                        <span className={mx(styles, "inbox-folder-chip-label")}>
                          {folder.name}
                        </span>
                        <span className={mx(styles, "inbox-folder-chip-count")}>
                          {count}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={tf("folderActions")}
                          className={mx(styles, "inbox-folder-more")}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={6}>
                          <DropdownMenuItem
                            onClick={() => setRenameTarget(folder)}
                          >
                            <Pencil className="size-4" />
                            {tf("rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(folder)}
                          >
                            <Trash2 className="size-4" />
                            {tf("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </nav>

            <div
              className={mx(styles, "inbox-toolbar")}
              data-tutorial="inbox-filters"
            >
              <div className={mx(styles, "inbox-tabs")} role="tablist">
                {(
                  [
                    ["unprocessed", "filterUnprocessed"],
                    ["processed", "filterProcessed"],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    data-active={filter === value || undefined}
                    className={mx(styles, "inbox-tab")}
                    onClick={() => setFilter(value)}
                  >
                    <span>{t(labelKey)}</span>
                    <span className={mx(styles, "inbox-tab-count")}>
                      {tabCounts[value]}
                    </span>
                  </button>
                ))}
              </div>

              <div className={mx(styles, "inbox-tools")}>
                <div
                  className={cn(
                    "writing-spine-search-wrap",
                    mx(styles, "inbox-search"),
                  )}
                  data-tutorial="inbox-search"
                >
                  <Search
                    className="writing-spine-search-icon"
                    aria-hidden="true"
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("searchInScope", {
                      scope: searchScopeLabel,
                    })}
                    className={cn(
                      "writing-spine-search",
                      mx(styles, "inbox-search-input"),
                    )}
                    aria-label={t("searchInScope", {
                      scope: searchScopeLabel,
                    })}
                  />
                </div>

                <div
                  className={mx(styles, "inbox-sort")}
                  data-tutorial="inbox-sort"
                >
                  <Select
                    value={sort}
                    onValueChange={(value) => {
                      if (
                        value === "newest" ||
                        value === "oldest" ||
                        value === "nameAsc" ||
                        value === "nameDesc"
                      ) {
                        setSort(value);
                      }
                    }}
                  >
                    <SelectTrigger
                      className={mx(styles, "inbox-sort-trigger")}
                      aria-label={t("sortBy")}
                    >
                      <SelectValue>{sortLabel(sort)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      align="end"
                      sideOffset={8}
                      className={mx(styles, "inbox-sort-menu")}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem
                          key={option}
                          value={option}
                          data-selected={sort === option || undefined}
                          className={mx(styles, "inbox-sort-option")}
                        >
                          {sortLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CollectionViewModeToggle
                  value={viewMode}
                  onChange={setViewMode}
                  route="home"
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <div
                className={mx(styles, "inbox-empty")}
                data-tutorial="inbox-list"
              >
                <span className={mx(styles, "inbox-empty-icon")}>
                  <Inbox className="size-5" aria-hidden />
                </span>
                <p className={mx(styles, "inbox-empty-title")}>
                  {emptyBecauseSearch
                    ? t("noResultsTitle")
                    : isEmptyLibrary
                      ? t("emptyTitle")
                      : isEmptyFolder
                        ? t("emptyFolderTitle")
                        : filter === "unprocessed"
                          ? t("emptyTitle")
                          : t("emptyProcessedTitle")}
                </p>
                <p className={mx(styles, "inbox-empty-body")}>
                  {emptyBecauseSearch
                    ? t("noResultsDescription")
                    : isEmptyLibrary
                      ? t("emptyDescription")
                      : isEmptyFolder
                        ? t("emptyFolderDescription")
                        : filter === "unprocessed"
                          ? t("emptyDescription")
                          : t("emptyProcessedDescription")}
                </p>
                {!emptyBecauseSearch &&
                (isEmptyLibrary ||
                  filter === "unprocessed" ||
                  isEmptyFolder) ? (
                  <Button type="button" onClick={openCreate}>
                    <Plus className="size-4" />
                    {t("capture")}
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul
                className={mx(
                  styles,
                  viewMode === "cards" ? "inbox-grid" : "inbox-list",
                )}
                data-tutorial="inbox-list"
              >
                {visible.map((item, index) => renderItem(item, index))}
              </ul>
            )}
        </>
      </div>

      <InboxCaptureDialog
        open={captureOpen}
        onOpenChange={handleCaptureOpenChange}
        folders={folders}
        defaultFolderId={captureDefaultFolderId}
        editItem={editItem}
      />

      <FolderNameDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        mode="create"
        occupiedNames={occupiedFolderNames}
        pending={isPending}
        onSubmit={handleCreateFolder}
      />

      <FolderNameDialog
        open={Boolean(renameTarget)}
        onOpenChange={(next) => {
          if (!next) setRenameTarget(null);
        }}
        mode="rename"
        initialName={renameTarget?.name ?? ""}
        occupiedNames={occupiedFolderNames.filter(
          (name) => name !== renameTarget?.name,
        )}
        pending={isPending}
        onSubmit={handleRenameFolder}
      />

      <DeleteFolderDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        name={deleteTarget?.name ?? ""}
        folderCount={0}
        itemCount={deleteItemCount}
        pending={isPending}
        description={
          deleteTarget
            ? t("deleteFolderDescription", {
                name: deleteTarget.name,
                count: deleteItemCount,
              })
            : undefined
        }
        onConfirm={handleDeleteFolder}
      />
    </PageShell>
  );
}
