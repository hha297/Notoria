"use client";

import type { ReactNode } from "react";
import { useState } from "react";
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
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

export type ExampleItem = {
  id: string;
  sentence: string;
  meaning: string;
  notes: string;
  sortOrder: number;
};

type ExamplePatch = Partial<
  Pick<ExampleItem, "sentence" | "meaning" | "notes">
>;

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
  detailsOpen,
  onToggleDetails,
}: {
  item: ExampleItem;
  index: number;
  onUpdate: (id: string, patch: ExamplePatch) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  placeholder: string;
  dragHandle: ReactNode;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  const t = useTranslations("vocabulary");
  const hasDetails = Boolean(item.meaning.trim() || item.notes.trim());

  return (
    <div className="rounded-lg border border-hairline-cloud bg-card">
      <div className="flex items-start gap-2 p-2 sm:items-center sm:p-2.5">
        {dragHandle}
        <span className="mt-2 w-6 shrink-0 text-sm font-medium text-muted-foreground sm:mt-0">
          {index + 1}.
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={item.sentence}
            onChange={(event) =>
              onUpdate(item.id, { sentence: event.target.value })
            }
            placeholder={placeholder}
            className="w-full"
            aria-label={`${t("examples")} ${index + 1}`}
          />
          <button
            type="button"
            onClick={onToggleDetails}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-ink"
            aria-expanded={detailsOpen}
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                detailsOpen ? "rotate-0" : "-rotate-90",
              )}
            />
            {t("exampleDetails")}
            {hasDetails && !detailsOpen ? (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("exampleDetailsFilled")}
              </span>
            ) : null}
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          aria-label={t("removeExample")}
          className="mt-1 shrink-0 sm:mt-0"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {detailsOpen ? (
        <div className="space-y-3 border-t border-hairline-cloud bg-muted/30 px-3 py-3 sm:ml-10 sm:mr-2 sm:mb-2 sm:rounded-md sm:border sm:px-3 sm:py-3">
          <div className="space-y-1.5">
            <Label htmlFor={`example-meaning-${item.id}`}>
              {t("exampleMeaning")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </Label>
            <Textarea
              id={`example-meaning-${item.id}`}
              value={item.meaning}
              onChange={(event) =>
                onUpdate(item.id, { meaning: event.target.value })
              }
              placeholder={t("exampleMeaningPlaceholder")}
              className="min-h-16"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`example-notes-${item.id}`}>
              {t("exampleNotes")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </Label>
            <Textarea
              id={`example-notes-${item.id}`}
              value={item.notes}
              onChange={(event) =>
                onUpdate(item.id, { notes: event.target.value })
              }
              placeholder={t("exampleNotesPlaceholder")}
              className="min-h-14"
            />
          </div>
        </div>
      ) : null}
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
  detailsOpen,
  onToggleDetails,
}: {
  item: ExampleItem;
  index: number;
  onUpdate: (id: string, patch: ExamplePatch) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  placeholder: string;
  detailsOpen: boolean;
  onToggleDetails: () => void;
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
        detailsOpen={detailsOpen}
        onToggleDetails={onToggleDetails}
        dragHandle={
          <button
            type="button"
            className="mt-1 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing sm:mt-0"
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
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        examples.map((item) => [
          item.id,
          Boolean(item.meaning.trim() || item.notes.trim()),
        ]),
      ),
  );
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
    const id = crypto.randomUUID();
    onChange([
      ...examples,
      {
        id,
        sentence: "",
        meaning: "",
        notes: "",
        sortOrder: examples.length,
      },
    ]);
    setOpenDetails((current) => ({ ...current, [id]: false }));
  }

  function updateExample(id: string, patch: ExamplePatch) {
    onChange(
      examples.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
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
    setOpenDetails((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function toggleDetails(id: string) {
    setOpenDetails((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  const list = (
    <div className="space-y-2.5">
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
            detailsOpen={Boolean(openDetails[item.id])}
            onToggleDetails={() => toggleDetails(item.id)}
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
            detailsOpen={Boolean(openDetails[item.id])}
            onToggleDetails={() => toggleDetails(item.id)}
            dragHandle={
              <span className="mt-1 rounded-md p-1 text-muted-foreground sm:mt-0">
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
      <div className="flex items-center justify-between gap-2">
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
