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
import { GripVertical, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import {
  countPrimaryMeanings,
  MAX_PRIMARY_MEANINGS,
} from "@/lib/vocabulary/primary-meanings";
import { cn } from "@/lib/utils";

export type MeaningItem = {
  id: string;
  meaning: string;
  isPrimary: boolean;
  sortOrder: number;
};

type SortableMeaningsProps = {
  meanings: MeaningItem[];
  onChange: (meanings: MeaningItem[]) => void;
};

function MeaningRowShell({
  item,
  index,
  onUpdate,
  onTogglePrimary,
  onRemove,
  canRemove,
  canMarkPrimary,
  placeholder,
  primaryLabel,
  secondaryLabel,
  dragHandle,
}: {
  item: MeaningItem;
  index: number;
  onUpdate: (id: string, meaning: string) => void;
  onTogglePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  canMarkPrimary: boolean;
  placeholder: string;
  primaryLabel: string;
  secondaryLabel: string;
  dragHandle: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2",
        item.isPrimary
          ? "border-accent-lime/50 bg-accent-lime/5"
          : "border-hairline-cloud opacity-90",
      )}
    >
      {dragHandle}
      <span className="w-6 text-sm font-medium text-muted-foreground">
        {index + 1}.
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onTogglePrimary(item.id)}
        disabled={!item.isPrimary && !canMarkPrimary}
        aria-pressed={item.isPrimary}
        aria-label={item.isPrimary ? primaryLabel : secondaryLabel}
        title={item.isPrimary ? primaryLabel : secondaryLabel}
        className={cn(
          "shrink-0",
          item.isPrimary
            ? "text-accent-lime hover:text-accent-lime"
            : "text-muted-foreground",
        )}
      >
        <Star
          className={cn("size-4", item.isPrimary && "fill-current")}
        />
      </Button>
      <Input
        value={item.meaning}
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
        aria-label="Remove meaning"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SortableMeaningRow({
  item,
  index,
  onUpdate,
  onTogglePrimary,
  onRemove,
  canRemove,
  canMarkPrimary,
  placeholder,
  primaryLabel,
  secondaryLabel,
}: {
  item: MeaningItem;
  index: number;
  onUpdate: (id: string, meaning: string) => void;
  onTogglePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  canMarkPrimary: boolean;
  placeholder: string;
  primaryLabel: string;
  secondaryLabel: string;
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
      <MeaningRowShell
        item={item}
        index={index}
        onUpdate={onUpdate}
        onTogglePrimary={onTogglePrimary}
        onRemove={onRemove}
        canRemove={canRemove}
        canMarkPrimary={canMarkPrimary}
        placeholder={placeholder}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
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

export function SortableMeanings({ meanings, onChange }: SortableMeaningsProps) {
  const mounted = useMounted();
  const t = useTranslations("vocabulary");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const primaryCount = countPrimaryMeanings(meanings);
  const canMarkPrimary = primaryCount < MAX_PRIMARY_MEANINGS;

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
        isPrimary: primaryCount === 0,
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

  function togglePrimary(id: string) {
    const target = meanings.find((item) => item.id === id);
    if (!target) return;

    if (target.isPrimary) {
      if (primaryCount <= 1) {
        toast.error(t("primaryMeaningRequired"));
        return;
      }
      onChange(
        meanings.map((item) =>
          item.id === id ? { ...item, isPrimary: false } : item,
        ),
      );
      return;
    }

    if (!canMarkPrimary) {
      toast.error(t("primaryMeaningLimit", { max: MAX_PRIMARY_MEANINGS }));
      return;
    }

    onChange(
      meanings.map((item) =>
        item.id === id ? { ...item, isPrimary: true } : item,
      ),
    );
  }

  function removeMeaning(id: string) {
    const remaining = meanings.filter((item) => item.id !== id);
    if (
      remaining.length > 0 &&
      countPrimaryMeanings(remaining) === 0
    ) {
      remaining[0] = { ...remaining[0]!, isPrimary: true };
    }

    onChange(
      remaining.map((item, index) => ({ ...item, sortOrder: index })),
    );
  }

  const list = (
    <div className="space-y-2">
      {meanings.map((item, index) =>
        mounted ? (
          <SortableMeaningRow
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateMeaning}
            onTogglePrimary={togglePrimary}
            onRemove={removeMeaning}
            canRemove={meanings.length > 1}
            canMarkPrimary={canMarkPrimary}
            placeholder={t("meaningPlaceholder")}
            primaryLabel={t("primaryMeaning")}
            secondaryLabel={t("markAsPrimary")}
          />
        ) : (
          <MeaningRowShell
            key={item.id}
            item={item}
            index={index}
            onUpdate={updateMeaning}
            onTogglePrimary={togglePrimary}
            onRemove={removeMeaning}
            canRemove={meanings.length > 1}
            canMarkPrimary={canMarkPrimary}
            placeholder={t("meaningPlaceholder")}
            primaryLabel={t("primaryMeaning")}
            secondaryLabel={t("markAsPrimary")}
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <label className="text-sm font-medium">{t("meanings")}</label>
          <p className="text-xs text-muted-foreground">
            {t("primaryMeaningHint", { max: MAX_PRIMARY_MEANINGS })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addMeaning}>
          <Plus className="size-4" />
          {t("addMeaning")}
        </Button>
      </div>

      {mounted ? (
        <DndContext
          id="vocabulary-meanings"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={meanings.map((item) => item.id)}
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
