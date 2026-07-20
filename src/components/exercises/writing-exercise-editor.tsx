"use client";

import type { JSONContent } from "@tiptap/react";
import { Download, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { QuestionSetBuilder } from "@/components/exercises/writing/question-set-builder";
import { WritingExportDialog } from "@/components/exercises/writing/export-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createExercise, updateExercise } from "@/lib/actions/exercises";
import {
  parseWritingContent,
  serializeWritingContent,
  writingContentHasPrompt,
  writingContentToEditorState,
  type WritingEditorState,
  type WritingMode,
  type WritingSection,
} from "@/lib/writing/content";
import type { ExerciseFormValues } from "@/schemas/exercise";

type WritingExerciseEditorProps = {
  exerciseType: ExerciseFormValues["type"];
  initialData?: {
    id: string;
    title: string;
    type: ExerciseFormValues["type"];
    content: unknown;
  };
};

const AUTOSAVE_MS = 1500;

export function WritingExerciseEditor({
  exerciseType,
  initialData,
}: WritingExerciseEditorProps) {
  const router = useRouter();
  const t = useTranslations("exercises.writing");
  const type = initialData?.type ?? exerciseType;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [editorState, setEditorState] = useState<WritingEditorState>(() =>
    writingContentToEditorState(
      parseWritingContent(initialData?.content ?? undefined),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ title, editorState, type, id: initialData?.id });

  useEffect(() => {
    latestRef.current = { title, editorState, type, id: initialData?.id };
  }, [title, editorState, type, initialData?.id]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  function buildPayload(
    nextTitle: string,
    nextState: WritingEditorState,
  ): ExerciseFormValues {
    return {
      title: nextTitle.trim(),
      type,
      content: serializeWritingContent(nextState) as Record<string, unknown>,
    };
  }

  async function persistExercise(showToast = true) {
    if (!title.trim()) {
      if (showToast) toast.error(t("titleRequired"));
      return;
    }

    if (
      editorState.mode === "question_set" &&
      !writingContentHasPrompt(editorState)
    ) {
      if (showToast) toast.error(t("promptRequired"));
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(title, editorState);

      if (initialData?.id) {
        await updateExercise(initialData.id, payload);
        if (showToast) toast.success(t("saved"));
        router.refresh();
      } else {
        const exercise = await createExercise(payload);
        if (showToast) toast.success(t("created"));
        router.push(`/exercises/${exercise.id}`);
      }
    } catch (error) {
      if (showToast) {
        toast.error(
          error instanceof Error ? error.message : t("saveFailed"),
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function runAutosave() {
    const { title: nextTitle, editorState: nextState, id } = latestRef.current;
    if (!id || !nextTitle.trim()) return;
    if (
      nextState.mode === "question_set" &&
      !writingContentHasPrompt(nextState)
    ) {
      return;
    }

    setIsAutosaving(true);
    try {
      await updateExercise(id, buildPayload(nextTitle, nextState));
    } catch {
      // Autosave failures are silent
    } finally {
      setIsAutosaving(false);
    }
  }

  function scheduleAutosave() {
    if (!initialData?.id) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void runAutosave();
    }, AUTOSAVE_MS);
  }

  function setMode(mode: WritingMode) {
    setEditorState((current) => {
      if (current.mode === mode) return current;
      return { ...current, mode };
    });
    scheduleAutosave();
  }

  function setDoc(doc: JSONContent) {
    setEditorState((current) => ({ ...current, doc }));
  }

  function setSections(sections: WritingSection[]) {
    setEditorState((current) => ({ ...current, sections }));
    scheduleAutosave();
  }

  async function handleRichAutosave(nextContent: JSONContent) {
    if (!initialData?.id || !title.trim()) return;

    const nextState: WritingEditorState = {
      ...editorState,
      mode: "rich_document",
      doc: nextContent,
    };
    setEditorState(nextState);
    setIsAutosaving(true);

    try {
      await updateExercise(initialData.id, buildPayload(title, nextState));
    } catch {
      // Autosave failures are silent
    } finally {
      setIsAutosaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="card-surface gap-0 overflow-hidden p-0 ring-0">
        <CardHeader className="space-y-2 border-b border-hairline-cloud px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 md:px-8 md:pt-8 md:pb-6">
          <CardTitle className="heading-md text-ink">
            {initialData ? t("editTitle") : t("newTitle")}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed sm:text-base">
            {t("formDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <div className="space-y-2">
            <Label htmlFor="title">{t("title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                scheduleAutosave();
              }}
              placeholder={t("titlePlaceholder")}
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("mode")}</Label>
            <ToggleGroup
              value={[editorState.mode]}
              onValueChange={(value) => {
                const next = value[0] as WritingMode | undefined;
                if (next) setMode(next);
              }}
              className="flex w-full max-w-md flex-wrap gap-2"
            >
              <ToggleGroupItem
                value="rich_document"
                className="flex-1 cursor-pointer"
              >
                {t("modes.richDocument")}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="question_set"
                className="flex-1 cursor-pointer"
              >
                {t("modes.questionSet")}
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">
              {editorState.mode === "rich_document"
                ? t("modes.richDocumentHint")
                : t("modes.questionSetHint")}
            </p>
          </div>

          {editorState.mode === "rich_document" ? (
            <div className="space-y-2">
              <Label>{t("content")}</Label>
              <RichTextEditor
                content={editorState.doc}
                placeholder={t("contentPlaceholder")}
                onChange={setDoc}
                onAutosave={
                  initialData?.id ? handleRichAutosave : undefined
                }
              />
            </div>
          ) : (
            <QuestionSetBuilder
              sections={editorState.sections}
              onChange={setSections}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {isAutosaving
            ? t("autosaving")
            : initialData
              ? t("autosaveReady")
              : t("autosavePending")}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setExportOpen(true)}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <Download className="size-4" />
            {t("export.button")}
          </Button>
          <Button
            onClick={() => persistExercise(true)}
            disabled={isSaving}
            size="lg"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("save")}
          </Button>
        </div>
      </div>

      <WritingExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        editorState={editorState}
      />
    </div>
  );
}
