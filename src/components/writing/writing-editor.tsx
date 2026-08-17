"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import { Download, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { QuestionSetBuilder } from "@/components/writing/question-set-builder";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { WritingAiBar } from "@/components/writing/writing-ai-bar";
import { CapitalizedInput, CapitalizedTextarea } from "@/components/form/capitalized-text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createWritingDocument, updateWritingDocument } from "@/lib/actions/writing";
import {
  parseWritingContent,
  serializeWritingContent,
  writingContentHasPrompt,
  writingContentToEditorState,
  type WritingEditorState,
  type WritingMode,
  type WritingSection,
} from "@/lib/writing/content";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  isKnownWritingTopic,
  type WritingCefr,
  type WritingFormality,
  type WritingMeta,
} from "@/lib/writing/meta";
import type { ExerciseFormValues } from "@/schemas/exercise";

type WritingEditorProps = {
  exerciseType: ExerciseFormValues["type"];
  /** When set, Cancel returns here and Save navigates here after persisting. */
  previewHref?: string;
  language?: string;
  initialData?: {
    id: string;
    title: string;
    description?: string | null;
    type: ExerciseFormValues["type"];
    content: unknown;
  };
};

const AUTOSAVE_MS = 1500;

export function WritingEditor({
  exerciseType,
  previewHref,
  language = "en",
  initialData,
}: WritingEditorProps) {
  const router = useRouter();
  const t = useTranslations("writing");
  const tMeta = useTranslations("writing.meta");
  const tCommon = useTranslations("common");
  const type = initialData?.type ?? exerciseType;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [editorState, setEditorState] = useState<WritingEditorState>(() =>
    writingContentToEditorState(
      parseWritingContent(initialData?.content ?? undefined),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    title,
    description,
    editorState,
    type,
    id: initialData?.id,
  });

  useEffect(() => {
    latestRef.current = {
      title,
      description,
      editorState,
      type,
      id: initialData?.id,
    };
  }, [title, description, editorState, type, initialData?.id]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  function buildPayload(
    nextTitle: string,
    nextDescription: string,
    nextState: WritingEditorState,
  ): ExerciseFormValues {
    return {
      title: nextTitle.trim(),
      description: nextDescription.trim(),
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
      const payload = buildPayload(title, description, editorState);

      if (initialData?.id) {
        await updateWritingDocument(initialData.id, payload);
        if (showToast) toast.success(t("saved"));
        router.replace("/writing");
      } else {
        await createWritingDocument(payload);
        if (showToast) toast.success(t("created"));
        router.replace("/writing");
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
    const {
      title: nextTitle,
      description: nextDescription,
      editorState: nextState,
      id,
    } = latestRef.current;
    if (!id || !nextTitle.trim()) return;
    if (
      nextState.mode === "question_set" &&
      !writingContentHasPrompt(nextState)
    ) {
      return;
    }

    setIsAutosaving(true);
    try {
      await updateWritingDocument(
        id,
        buildPayload(nextTitle, nextDescription, nextState),
      );
    } catch {
      // Autosave failures are silent
    } finally {
      setIsAutosaving(false);
    }
  }

  function scheduleAutosave() {
    // Explicit Save when coming from preview so Cancel can discard cleanly.
    if (!initialData?.id || previewHref) return;
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

  function setMeta(patch: Partial<WritingMeta>) {
    setEditorState((current) => ({
      ...current,
      meta: { ...current.meta, ...patch },
    }));
    scheduleAutosave();
  }

  async function handleRichAutosave(nextContent: JSONContent) {
    if (!initialData?.id || !title.trim() || previewHref) return;

    const nextState: WritingEditorState = {
      ...editorState,
      mode: "rich_document",
      doc: nextContent,
    };
    setEditorState(nextState);
    setIsAutosaving(true);

    try {
      await updateWritingDocument(
        initialData.id,
        buildPayload(title, description, nextState),
      );
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
            <Label htmlFor="title">{t("documentTitle")}</Label>
            <CapitalizedInput
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
            <Label htmlFor="description">
              {t("documentDescription")}{" "}
              <span className="font-normal text-muted-foreground">
                ({t("optional")})
              </span>
            </Label>
            <CapitalizedTextarea
              id="description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                scheduleAutosave();
              }}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              className="min-h-20 resize-y"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="writing-cefr">{tMeta("cefrLabel")}</Label>
              <Select
                value={editorState.meta.cefrLevel ?? "none"}
                onValueChange={(value) =>
                  value &&
                  setMeta({
                    cefrLevel:
                      value === "none" ? null : (value as WritingCefr),
                  })
                }
              >
                <SelectTrigger
                  id="writing-cefr"
                  className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!"
                >
                  <SelectValue placeholder={tMeta("cefrPlaceholder")}>
                    {editorState.meta.cefrLevel
                      ? tMeta(`cefr.${editorState.meta.cefrLevel}`)
                      : tMeta("none")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tMeta("none")}</SelectItem>
                  {WRITING_CEFR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {tMeta(`cefr.${level}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="writing-topic">{tMeta("topicLabel")}</Label>
              <Select
                value={editorState.meta.topic ?? "none"}
                onValueChange={(value) =>
                  value &&
                  setMeta({ topic: value === "none" ? null : value })
                }
              >
                <SelectTrigger
                  id="writing-topic"
                  className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!"
                >
                  <SelectValue placeholder={tMeta("topicPlaceholder")}>
                    {editorState.meta.topic
                      ? isKnownWritingTopic(editorState.meta.topic)
                        ? tMeta(`topics.${editorState.meta.topic}`)
                        : editorState.meta.topic
                      : tMeta("none")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tMeta("none")}</SelectItem>
                  {WRITING_TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {tMeta(`topics.${topic}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="writing-formality">
                {tMeta("formalityLabel")}
              </Label>
              <Select
                value={editorState.meta.formality ?? "none"}
                onValueChange={(value) =>
                  value &&
                  setMeta({
                    formality:
                      value === "none"
                        ? null
                        : (value as WritingFormality),
                  })
                }
              >
                <SelectTrigger
                  id="writing-formality"
                  className="h-10! w-full rounded-md bg-background px-3 py-0 data-[size=default]:h-10!"
                >
                  <SelectValue placeholder={tMeta("formalityPlaceholder")}>
                    {editorState.meta.formality
                      ? tMeta(`formality.${editorState.meta.formality}`)
                      : tMeta("none")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tMeta("none")}</SelectItem>
                  {WRITING_FORMALITY.map((item) => (
                    <SelectItem key={item} value={item}>
                      {tMeta(`formality.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <WritingAiBar
            language={language}
            title={title}
            editorState={editorState}
            editor={editor}
            onEditorStateChange={(next) => {
              setEditorState(next);
              scheduleAutosave();
            }}
          />

          {editorState.mode === "rich_document" ? (
            <div className="space-y-2">
              <Label>{t("content")}</Label>
              <RichTextEditor
                content={editorState.doc}
                placeholder={t("contentPlaceholder")}
                onChange={setDoc}
                onEditorReady={setEditor}
                onAutosave={
                  initialData?.id && !previewHref
                    ? handleRichAutosave
                    : undefined
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
          {previewHref
            ? t("editSaveHint")
            : isAutosaving
              ? t("autosaving")
              : initialData
                ? t("autosaveReady")
                : t("autosavePending")}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {previewHref ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.replace(previewHref)}
              disabled={isSaving}
              className="h-11 w-full sm:h-9 sm:w-auto"
            >
              {tCommon("cancel")}
            </Button>
          ) : null}
          <LockedFeatureButton
            type="button"
            variant="outline"
            size="lg"
            icon={<Download className="size-4" />}
            onClick={() => setExportOpen(true)}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {t("export.button")}
          </LockedFeatureButton>
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
        description={description}
        editorState={editorState}
      />
    </div>
  );
}
