"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Folder } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FolderBreadcrumbs } from "@/components/folders/folder-breadcrumbs";
import { FolderCard } from "@/components/folders/folder-card";
import { DeleteFolderDialog } from "@/components/folders/delete-folder-dialog";
import { FolderDndProvider } from "@/components/folders/folder-dnd";
import { FolderNameDialog } from "@/components/folders/folder-name-dialog";
import { MoveToFolderDialog } from "@/components/folders/move-to-folder-dialog";
import {
  createFolder,
  deleteFolder,
  moveIntoFolder,
  renameFolder,
} from "@/lib/actions/folders";
import { folderHref } from "@/lib/folders/paths";
import {
  childrenOf,
  countItemsInFolders,
  descendantIds,
  folderMatchesQuery,
} from "@/lib/folders/tree";
import type {
  FolderListItem,
  FolderMoveItemType,
  FolderSection,
} from "@/lib/folders/types";

export type FolderWorkspaceItem = {
  id: string;
  title: string;
  folderId?: string | null;
};

type MoveTarget = {
  type: FolderMoveItemType;
  id: string;
  title: string;
  folderId: string | null;
};

type FolderWorkspaceContextValue = {
  openCreate: () => void;
  openMoveItem: (item: {
    id: string;
    title: string;
    folderId?: string | null;
  }) => void;
  section: FolderSection;
  folders: FolderListItem[];
  items: FolderWorkspaceItem[];
  visibleFolders: FolderListItem[];
  searchQuery: string;
  onRenameFolder: (folder: FolderListItem) => void;
  onDeleteFolder: (folder: FolderListItem) => void;
  onMoveFolder: (folder: FolderListItem) => void;
};

const FolderWorkspaceContext = createContext<FolderWorkspaceContextValue | null>(
  null,
);

export function useFolderWorkspace() {
  return useContext(FolderWorkspaceContext);
}

type FolderWorkspaceProps = {
  section: FolderSection;
  folders: FolderListItem[];
  currentFolderId: string | null;
  items: FolderWorkspaceItem[];
  search?: string;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  header?: ReactNode;
  children: ReactNode;
};

export function FolderWorkspace({
  section,
  folders,
  currentFolderId,
  items,
  search = "",
  createOpen,
  onCreateOpenChange,
  header,
  children,
}: FolderWorkspaceProps) {
  const t = useTranslations("folders");
  const te = useTranslations("errors");
  const router = useRouter();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FolderListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderListItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  const isCreateOpen = createOpen ?? internalCreateOpen;

  function setCreateOpen(open: boolean) {
    onCreateOpenChange?.(open);
    if (createOpen === undefined) {
      setInternalCreateOpen(open);
    }
  }

  const query = search.trim();
  const visibleFolders = useMemo(() => {
    if (query) {
      return folders
        .filter((folder) => folderMatchesQuery(folder, query))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
    }
    return childrenOf(folders, currentFolderId);
  }, [folders, currentFolderId, query]);

  const contextValue = useMemo<FolderWorkspaceContextValue>(
    () => ({
      openCreate: () => setCreateOpen(true),
      openMoveItem: (item) =>
        setMoveTarget({
          type: section,
          id: item.id,
          title: item.title,
          folderId: item.folderId ?? null,
        }),
      section,
      folders,
      items,
      visibleFolders,
      searchQuery: query,
      onRenameFolder: setRenameTarget,
      onDeleteFolder: setDeleteTarget,
      onMoveFolder: (folder) =>
        setMoveTarget({
          type: "folder",
          id: folder.id,
          title: folder.name,
          folderId: folder.parentId,
        }),
    }),
    [section, folders, items, visibleFolders, query],
  );

  function errorMessage(error: unknown) {
    if (error instanceof Error) {
      if (error.message === "INVALID_FOLDER_MOVE") return t("invalidMove");
      if (error.message === "FOLDER_TOO_DEEP") return t("tooDeep");
      if (error.message === "FOLDER_NOT_FOUND") return t("notFound");
    }
    return te("generic");
  }

  function handleCreate(name: string) {
    startTransition(async () => {
      try {
        await createFolder({
          section,
          parentId: currentFolderId,
          name,
        });
        toast.success(t("created"));
        setCreateOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleRename(name: string) {
    if (!renameTarget) return;
    startTransition(async () => {
      try {
        await renameFolder({ id: renameTarget.id, name });
        toast.success(t("renamed"));
        setRenameTarget(null);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const deletingCurrent = deleteTarget.id === currentFolderId;
    const parentId = deleteTarget.parentId;
    startTransition(async () => {
      try {
        await deleteFolder(deleteTarget.id);
        toast.success(t("deleted"));
        setDeleteTarget(null);
        if (deletingCurrent) {
          router.push(folderHref(section, parentId));
        }
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function runMove(input: {
    type: FolderMoveItemType;
    id: string;
    folderId: string | null;
  }) {
    startTransition(async () => {
      try {
        await moveIntoFolder({
          itemType: input.type,
          id: input.id,
          folderId: input.folderId,
        });
        toast.success(t("moved"));
        setMoveTarget(null);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const deleteFolderCount = deleteTarget
    ? descendantIds(folders, deleteTarget.id).length
    : 0;
  const deleteItemCount = deleteTarget
    ? countItemsInFolders(items, [
        deleteTarget.id,
        ...descendantIds(folders, deleteTarget.id),
      ])
    : 0;

  return (
    <FolderWorkspaceContext.Provider value={contextValue}>
      <FolderDndProvider
        folders={folders}
        currentFolderId={currentFolderId}
        overlayLabel={(kind, id) => {
          if (kind === "folder") {
            return folders.find((folder) => folder.id === id)?.name ?? null;
          }
          return items.find((item) => item.id === id)?.title ?? null;
        }}
        onMove={({ kind, id, folderId }) =>
          runMove({
            type: kind === "folder" ? "folder" : section,
            id,
            folderId,
          })
        }
      >
        <div className="space-y-4">
          {header}
          <FolderBreadcrumbs
            section={section}
            folders={folders}
            currentFolderId={currentFolderId}
          />
          {children}
        </div>
      </FolderDndProvider>

      <FolderNameDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        pending={isPending}
        onSubmit={handleCreate}
      />
      <FolderNameDialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        mode="rename"
        initialName={renameTarget?.name ?? ""}
        pending={isPending}
        onSubmit={handleRename}
      />
      {deleteTarget ? (
        <DeleteFolderDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          name={deleteTarget.name}
          folderCount={deleteFolderCount}
          itemCount={deleteItemCount}
          pending={isPending}
          onConfirm={handleDelete}
        />
      ) : null}
      {moveTarget ? (
        <MoveToFolderDialog
          open
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          folders={folders}
          itemType={moveTarget.type}
          itemId={moveTarget.id}
          currentFolderId={moveTarget.folderId}
          pending={isPending}
          onMove={(folderId) =>
            runMove({
              type: moveTarget.type,
              id: moveTarget.id,
              folderId,
            })
          }
        />
      ) : null}
    </FolderWorkspaceContext.Provider>
  );
}

export function FolderGrid() {
  const workspace = useFolderWorkspace();
  const t = useTranslations("folders");

  if (!workspace || workspace.visibleFolders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {workspace.searchQuery ? (
        <h3 className="text-sm font-medium text-muted-foreground">
          {t("foldersHeading")}
        </h3>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workspace.visibleFolders.map((folder) => {
          const nestedIds = [
            folder.id,
            ...descendantIds(workspace.folders, folder.id),
          ];
          return (
            <FolderCard
              key={folder.id}
              folder={folder}
              section={workspace.section}
              itemCount={countItemsInFolders(workspace.items, nestedIds)}
              onRename={() => workspace.onRenameFolder(folder)}
              onDelete={() => workspace.onDeleteFolder(folder)}
              onMove={() => workspace.onMoveFolder(folder)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FolderEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
        <Folder className="size-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

