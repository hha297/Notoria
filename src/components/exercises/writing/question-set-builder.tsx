"use client";

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
import { GripVertical, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SectionDragHandle,
  WritingSectionCard,
} from "@/components/exercises/writing/writing-section-card";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";
import {
  countWritingQuestions,
  createSection,
  type WritingSection,
} from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type QuestionSetBuilderProps = {
  sections: WritingSection[];
  onChange: (sections: WritingSection[]) => void;
};

function SortableSectionRow({
  section,
  index,
  canDelete,
  collapsed,
  onToggleCollapse,
  onChange,
  onDelete,
}: {
  section: WritingSection;
  index: number;
  canDelete: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChange: (section: WritingSection) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-70 shadow-md")}
    >
      <WritingSectionCard
        section={section}
        index={index}
        canDelete={canDelete}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onChange={onChange}
        onDelete={onDelete}
        dragHandle={
          <SectionDragHandle attributes={attributes} listeners={listeners} />
        }
      />
    </div>
  );
}

export function QuestionSetBuilder({
  sections,
  onChange,
}: QuestionSetBuilderProps) {
  const t = useTranslations("exercises.writing");
  const mounted = useMounted();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function updateSections(next: WritingSection[]) {
    onChange(
      next.map((section, index) => ({
        ...section,
        sortOrder: index,
      })),
    );
  }

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((item) => item.id === active.id);
    const newIndex = sections.findIndex((item) => item.id === over.id);
    updateSections(arrayMove(sections, oldIndex, newIndex));
  }

  function addSection() {
    updateSections([...sections, createSection(sections.length)]);
  }

  function updateSection(next: WritingSection) {
    updateSections(
      sections.map((section) => (section.id === next.id ? next : section)),
    );
  }

  function deleteSection(id: string) {
    if (sections.length <= 1) return;
    updateSections(sections.filter((section) => section.id !== id));
    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function toggleCollapse(id: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const list = (
    <div className="space-y-4">
      {sections.map((section, index) =>
        mounted ? (
          <SortableSectionRow
            key={section.id}
            section={section}
            index={index}
            canDelete={sections.length > 1}
            collapsed={collapsedIds.has(section.id)}
            onToggleCollapse={() => toggleCollapse(section.id)}
            onChange={updateSection}
            onDelete={() => deleteSection(section.id)}
          />
        ) : (
          <WritingSectionCard
            key={section.id}
            section={section}
            index={index}
            canDelete={sections.length > 1}
            collapsed={collapsedIds.has(section.id)}
            onToggleCollapse={() => toggleCollapse(section.id)}
            onChange={updateSection}
            onDelete={() => deleteSection(section.id)}
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{t("sections")}</p>
          <p className="text-xs text-muted-foreground">
            {t("questionCount", { count: countWritingQuestions(sections) })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="size-4" />
          {t("addSection")}
        </Button>
      </div>

      {mounted ? (
        <DndContext
          id="writing-sections"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((section) => section.id)}
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
