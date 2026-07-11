"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MeaningItem = {
  id: string;
  meaning: string;
  sortOrder: number;
};

type SortableMeaningsProps = {
  meanings: MeaningItem[];
  onChange: (meanings: MeaningItem[]) => void;
};

function SortableMeaningRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  item: MeaningItem;
  index: number;
  onUpdate: (id: string, meaning: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2",
        isDragging && "opacity-60 shadow-md",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-sm font-medium text-muted-foreground">
        {index + 1}.
      </span>
      <Input
        value={item.meaning}
        onChange={(event) => onUpdate(item.id, event.target.value)}
        placeholder="Enter meaning"
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
        aria-label="Remove meaning"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function SortableMeanings({ meanings, onChange }: SortableMeaningsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = meanings.findIndex((item) => item.id === active.id);
    const newIndex = meanings.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(meanings, oldIndex, newIndex).map(
      (item, index) => ({
        ...item,
        sortOrder: index,
      }),
    );

    onChange(reordered);
  }

  function addMeaning() {
    onChange([
      ...meanings,
      {
        id: crypto.randomUUID(),
        meaning: "",
        sortOrder: meanings.length,
      },
    ]);
  }

  function updateMeaning(id: string, meaning: string) {
    onChange(
      meanings.map((item) =>
        item.id === id ? { ...item, meaning } : item,
      ),
    );
  }

  function removeMeaning(id: string) {
    onChange(
      meanings
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sortOrder: index })),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Meanings</label>
        <Button type="button" variant="outline" size="sm" onClick={addMeaning}>
          <Plus className="size-4" />
          Add meaning
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={meanings.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {meanings.map((item, index) => (
              <SortableMeaningRow
                key={item.id}
                item={item}
                index={index}
                onUpdate={updateMeaning}
                onRemove={removeMeaning}
                canRemove={meanings.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
