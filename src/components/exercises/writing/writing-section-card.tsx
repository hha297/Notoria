"use client";

import type { ReactNode } from "react";
import type { DraggableAttributes, DragEndEvent } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  QuestionDragHandle,
  WritingQuestionCard,
} from "@/components/exercises/writing/writing-question-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMounted } from "@/hooks/use-mounted";
import {
  createQuestion,
  type WritingQuestion,
  type WritingSection,
} from "@/lib/writing/content";
import { cn } from "@/lib/utils";

type WritingSectionCardProps = {
  section: WritingSection;
  index: number;
  canDelete: boolean;
  collapsed: boolean;
  dragHandle: ReactNode;
  onToggleCollapse: () => void;
  onChange: (section: WritingSection) => void;
  onDelete: () => void;
};

function SortableQuestionRow({
  question,
  index,
  canDelete,
  onChange,
  onDuplicate,
  onDelete,
}: {
  question: WritingQuestion;
  index: number;
  canDelete: boolean;
  onChange: (question: WritingQuestion) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-60 shadow-md")}
    >
      <WritingQuestionCard
        question={question}
        index={index}
        canDelete={canDelete}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        dragHandle={
          <QuestionDragHandle attributes={attributes} listeners={listeners} />
        }
      />
    </div>
  );
}

export function WritingSectionCard({
  section,
  index,
  canDelete,
  collapsed,
  dragHandle,
  onToggleCollapse,
  onChange,
  onDelete,
}: WritingSectionCardProps) {
  const t = useTranslations("exercises.writing");
  const mounted = useMounted();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function updateQuestions(questions: WritingQuestion[]) {
    onChange({
      ...section,
      questions: questions.map((question, questionIndex) => ({
        ...question,
        sortOrder: questionIndex,
      })),
    });
  }

  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = section.questions.findIndex((item) => item.id === active.id);
    const newIndex = section.questions.findIndex((item) => item.id === over.id);
    updateQuestions(arrayMove(section.questions, oldIndex, newIndex));
  }

  function addQuestion() {
    updateQuestions([
      ...section.questions,
      createQuestion(section.questions.length),
    ]);
  }

  function updateQuestion(next: WritingQuestion) {
    updateQuestions(
      section.questions.map((question) =>
        question.id === next.id ? next : question,
      ),
    );
  }

  function duplicateQuestion(id: string) {
    const sourceIndex = section.questions.findIndex((item) => item.id === id);
    if (sourceIndex < 0) return;

    const source = section.questions[sourceIndex];
    const copy: WritingQuestion = {
      ...source,
      id: crypto.randomUUID(),
      sortOrder: sourceIndex + 1,
    };

    const next = [...section.questions];
    next.splice(sourceIndex + 1, 0, copy);
    updateQuestions(next);
  }

  function deleteQuestion(id: string) {
    if (section.questions.length <= 1) return;
    updateQuestions(section.questions.filter((question) => question.id !== id));
  }

  const questionList = (
    <div className="space-y-3">
      {section.questions.map((question, questionIndex) =>
        mounted ? (
          <SortableQuestionRow
            key={question.id}
            question={question}
            index={questionIndex}
            canDelete={section.questions.length > 1}
            onChange={updateQuestion}
            onDuplicate={() => duplicateQuestion(question.id)}
            onDelete={() => deleteQuestion(question.id)}
          />
        ) : (
          <WritingQuestionCard
            key={question.id}
            question={question}
            index={questionIndex}
            canDelete={section.questions.length > 1}
            onChange={updateQuestion}
            onDuplicate={() => duplicateQuestion(question.id)}
            onDelete={() => deleteQuestion(question.id)}
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
    <div className="overflow-hidden rounded-2xl border border-hairline-cloud bg-card">
      <div className="flex items-center gap-2 border-b border-hairline-cloud px-3 py-3 sm:px-4">
        {dragHandle}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label={collapsed ? t("expandSection") : t("collapseSection")}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              collapsed && "-rotate-90",
            )}
          />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("section")} {index + 1}
          </p>
          <Input
            value={section.title}
            onChange={(event) =>
              onChange({ ...section, title: event.target.value })
            }
            placeholder={t("sectionTitlePlaceholder")}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label={t("deleteSection")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-4 p-3 sm:p-4">
          {mounted ? (
            <DndContext
              id={`writing-section-questions-${section.id}`}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleQuestionDragEnd}
            >
              <SortableContext
                items={section.questions.map((question) => question.id)}
                strategy={verticalListSortingStrategy}
              >
                {questionList}
              </SortableContext>
            </DndContext>
          ) : (
            questionList
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
          >
            <Plus className="size-4" />
            {t("addQuestion")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function SectionDragHandle({
  attributes,
  listeners,
}: {
  attributes: DraggableAttributes;
  listeners?: SyntheticListenerMap;
}) {
  const t = useTranslations("exercises.writing");

  return (
    <button
      type="button"
      className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-label={t("dragSection")}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
