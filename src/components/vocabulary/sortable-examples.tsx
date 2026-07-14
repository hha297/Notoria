"use client";

import type { ReactNode } from "react";
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
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export type ExampleItem = {
  id: string;
  sentence: string;
  sortOrder: number;
};

type SortableExamplesProps = {
  examples: ExampleItem[];
  onChange: (examples: ExampleItem[]) => void;
};

function ExampleRowShell({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  placeholder,
  dragHandle,
}: {
  item: ExampleItem;
  index: number;
  onUpdate: (id: string, sentence: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  placeholder: string;
  dragHandle: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
      {dragHandle}
      <span className="w-6 text-sm font-medium text-muted-foreground">
        {index + 1}.
      </span>
      <Input
        value={item.sentence}
        onChange={(event) => onUpdate(item.id, event.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(item.id)}
        disabled={!canRemove}
        aria-label="Remove example"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SortableExampleRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  placeholder,
}: {
  item: ExampleItem;
  index: number;
  onUpdate: (id: string, sentence: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  placeholder: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-60 shadow-md")}
    >
      <ExampleRowShell
        item={item}
        index={index}
        onUpdate={onUpdate}
        onRemove={onRemove}
        canRemove={canRemove}
        placeholder={placeholder}
        dragHandle={
          <button
            type="button"
            className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

export function SortableExamples({
  examples,
  onChange,
}: SortableExamplesProps) {
  const mounted = useMounted();
  const t = useTranslations("vocabulary");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = examples.findIndex((item) => item.id === active.id);
    const newIndex = examples.findIndex((item) => item.id === over.id);
    onChange(
      arrayMove(examples, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    );
  }

  function addExample() {
    onChange([
      ...examples,
      {
        id: crypto.randomUUID(),
        sentence: "",
        sortOrder: examples.length,
      },
    ]);
  }

  function updateExample(id: string, sentence: string) {
    onChange(
      examples.map((item) =>
        item.id === id ? { ...item, sentence } : item,
      ),
    );
  }

  function removeExample(id: string) {
    if (examples.length <= 1) {
      return;
    }

    onChange(
      examples
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, sortOrder: index })),
    );
  }

  const list = (
    <div className="space-y-2">
      {examples.map((item, index) =>
        mounted ? (
          <SortableExampleRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateExample}
            onRemove={removeExample}
            canRemove={examples.length > 1}
            placeholder={t("examplePlaceholder")}
          />
        ) : (
          <ExampleRowShell
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateExample}
            onRemove={removeExample}
            canRemove={examples.length > 1}
            placeholder={t("examplePlaceholder")}
            dragHandle={
              <span className="rounded-md p-1 text-muted-foreground">
                <GripVertical className="size-4" />
              </span>
            }
          />
        ),
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{t("examples")}</label>
        <Button type="button" variant="outline" size="sm" onClick={addExample}>
          <Plus className="size-4" />
          {t("addExample")}
        </Button>
      </div>

      {mounted ? (
        <DndContext
          id="vocabulary-examples"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={examples.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {list}
          </SortableContext>
        </DndContext>
      ) : (
        list
      )}
    </div>
  );
}
