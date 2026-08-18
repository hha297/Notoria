"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  folderDropId,
  itemDragId,
  parseDragId,
  parseDropId,
} from "@/lib/folders/dnd-ids";
import { wouldCreateCycle } from "@/lib/folders/tree";
import type { FolderListItem } from "@/lib/folders/types";

type DragKind = "folder" | "item";

type FolderDndContextValue = {
  folders: FolderListItem[];
  currentFolderId: string | null;
  activeId: string | null;
  skipNextClick: () => boolean;
};

const FolderDndContext = createContext<FolderDndContextValue | null>(null);

export function useFolderDnd() {
  return useContext(FolderDndContext);
}

type FolderDndProviderProps = {
  folders: FolderListItem[];
  currentFolderId: string | null;
  overlayLabel?: (kind: DragKind, id: string) => string | null;
  onMove: (input: {
    kind: DragKind;
    id: string;
    folderId: string | null;
  }) => void;
  children: ReactNode;
};

export function FolderDndProvider({
  folders,
  currentFolderId,
  overlayLabel,
  onMove,
  children,
}: FolderDndProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const active = activeId ? parseDragId(activeId) : null;
  const label =
    active && overlayLabel ? overlayLabel(active.kind, active.id) : null;

  const value = useMemo<FolderDndContextValue>(
    () => ({
      folders,
      currentFolderId,
      activeId,
      skipNextClick: () => {
        if (!didDrag) return false;
        setDidDrag(false);
        return true;
      },
    }),
    [folders, currentFolderId, activeId, didDrag],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDidDrag(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragged = parseDragId(String(event.active.id));
    const destination = event.over
      ? parseDropId(String(event.over.id))
      : undefined;
    setActiveId(null);

    if (!dragged || destination === undefined) return;
    if (dragged.kind === "folder" && destination === dragged.id) return;
    if (
      dragged.kind === "folder" &&
      wouldCreateCycle(folders, dragged.id, destination)
    ) {
      return;
    }

    onMove({
      kind: dragged.kind,
      id: dragged.id,
      folderId: destination,
    });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <FolderDndContext.Provider value={value}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className="flex max-w-xs items-center gap-2 rounded-lg border border-hairline-cloud bg-card px-3 py-2 text-sm font-medium text-ink shadow-md">
              {active.kind === "folder" ? (
                <Folder className="size-4 text-amber-500" />
              ) : null}
              <span className="truncate">{label ?? ""}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </FolderDndContext.Provider>
  );
}

export function FolderItemDrag({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemDragId(id),
    data: { type: "item", id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && "opacity-40", className)}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function useFolderItemDrag(id: string) {
  return useDraggable({
    id: itemDragId(id),
    data: { type: "item", id },
  });
}

export function useFolderDroppable(
  folderId: string | null,
  disabled?: boolean,
) {
  const dropId = folderId ? folderDropId(folderId) : "crumb:root";
  return useDroppable({
    id: dropId,
    disabled,
    data: { folderId },
  });
}
