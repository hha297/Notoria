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
import {
  CapitalizedInput,
  CapitalizedTextarea,
} from "@/components/form/capitalized-text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { composerStyles } from "@/components/vocabulary/vocabulary-composer";
import { useFocusNewItem } from "@/hooks/use-focus-new-item";
import { useMounted } from "@/hooks/use-mounted";
import { mx } from "@/lib/css-module";
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
  inputRef,
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
  inputRef?: (node: HTMLInputElement | null) => void;
}) {
  const t = useTranslations("vocabulary");
  const hasDetails = Boolean(item.meaning.trim() || item.notes.trim());

  return (
    <div className={mx(composerStyles, "vocab-composer-item")}>
      <div className="flex items-start gap-2.5 p-3.5 sm:items-center sm:gap-3 sm:p-4">
        {dragHandle}
        <span
          className={mx(composerStyles, "vocab-composer-index mt-1 sm:mt-0")}
          aria-hidden
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <CapitalizedInput
            ref={inputRef}
            value={item.sentence}
            onChange={(event) =>
              onUpdate(item.id, { sentence: event.target.value })
            }
            placeholder={placeholder}
            className={mx(composerStyles, "vocab-composer-field w-full")}
            aria-label={`${t("examples")} ${index + 1}`}
          />
          <button
            type="button"
            onClick={onToggleDetails}
            className={mx(composerStyles, "vocab-composer-details-toggle")}
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
              <span className={mx(composerStyles, "vocab-composer-details-badge")}>
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
          className={mx(
            composerStyles,
            "vocab-composer-icon-btn vocab-composer-icon-btn-danger mt-1 shrink-0 sm:mt-0",
          )}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {detailsOpen ? (
        <div
          className={mx(
            composerStyles,
            "vocab-composer-details space-y-3 px-3 py-3",
          )}
        >
          <div className="space-y-1.5">
            <Label
              htmlFor={`example-meaning-${item.id}`}
              className={mx(
                composerStyles,
                "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.14em] uppercase",
              )}
            >
              {t("exampleMeaning")}{" "}
              <span className="font-normal tracking-normal text-muted-foreground normal-case">
                ({t("optional")})
              </span>
            </Label>
            <CapitalizedTextarea
              id={`example-meaning-${item.id}`}
              value={item.meaning}
              onChange={(event) =>
                onUpdate(item.id, { meaning: event.target.value })
              }
              placeholder={t("exampleMeaningPlaceholder")}
              className={mx(composerStyles, "vocab-composer-field min-h-16")}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor={`example-notes-${item.id}`}
              className={mx(
                composerStyles,
                "vocab-composer-kicker text-[0.68rem] font-semibold tracking-[0.14em] uppercase",
              )}
            >
              {t("exampleNotes")}{" "}
              <span className="font-normal tracking-normal text-muted-foreground normal-case">
                ({t("optional")})
              </span>
            </Label>
            <CapitalizedTextarea
              id={`example-notes-${item.id}`}
              value={item.notes}
              onChange={(event) =>
                onUpdate(item.id, { notes: event.target.value })
              }
              placeholder={t("exampleNotesPlaceholder")}
              className={mx(composerStyles, "vocab-composer-field min-h-14")}
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
  inputRef,
}: {
  item: ExampleItem;
  index: number;
  onUpdate: (id: string, patch: ExamplePatch) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  placeholder: string;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  inputRef?: (node: HTMLInputElement | null) => void;
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
        inputRef={inputRef}
        dragHandle={
          <button
            type="button"
            className={mx(
              composerStyles,
              "vocab-composer-drag mt-1 cursor-grab touch-none p-1.5 active:cursor-grabbing sm:mt-0",
            )}
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
  const { requestFocus, bindRef } = useFocusNewItem<HTMLInputElement>();
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
    requestFocus(id);
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
    <div className="space-y-3.5">
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
            inputRef={bindRef(item.id)}
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
            inputRef={bindRef(item.id)}
            dragHandle={
              <span
                className={mx(
                  composerStyles,
                  "vocab-composer-drag mt-1 p-1.5 sm:mt-0",
                )}
              >
                <GripVertical className="size-4" />
              </span>
            }
          />
        ),
      )}
    </div>
  );

  return (
    <div className={mx(composerStyles, "vocab-composer-block")}>
      <div className={mx(composerStyles, "vocab-composer-section-head")}>
        <div className={mx(composerStyles, "vocab-composer-section-copy")}>
          <h3 className={mx(composerStyles, "vocab-composer-section-title")}>
            {t("examples")}
          </h3>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addExample}
          className={mx(composerStyles, "vocab-composer-add")}
        >
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
