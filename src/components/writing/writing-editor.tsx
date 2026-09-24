"use client";

import type { Editor, JSONContent } from "@tiptap/react";
import { ArrowLeft, Download, FileText, ListChecks, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { QuestionSetBuilder } from "@/components/writing/question-set-builder";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { WritingAiBar } from "@/components/writing/writing-ai-bar";
import { WritingChipPicker } from "@/components/writing/writing-chip-picker";
import { CapitalizedInput } from "@/components/form/capitalized-text";
import { DescriptionField } from "@/components/form/description-field";
import { ContentTransition } from "@/components/layout/content-transition";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { useMutationLock } from "@/hooks/use-mutation-lock";
import { createWritingDocument, updateWritingDocument } from "@/lib/actions/writing";
import { completeStudyInboxItem } from "@/lib/actions/study-inbox";
import { afterEditorHydration } from "@/lib/editor/hydration";
import { navigateAfterSuccess } from "@/lib/navigation/after-success";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeDescription } from "@/lib/description-content";
import { replaceInQuestionSet } from "@/lib/writing/ai-apply";
import type { WritingAiSuggestion } from "@/lib/writing/ai-types";
import {
  clearQuestionFeedback,
  removeSuggestionFromMap,
  type QuestionAiFeedbackMap,
} from "@/lib/writing/ai-question-feedback";
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
  buildWritingEditorSnapshot,
  writingEditorHasRequiredContent,
  writingEditorSnapshotsEqual,
  type WritingEditorSnapshot,
} from "@/lib/writing/editor-snapshot";
import { writingEditorHasExportableContent } from "@/lib/writing/export";
import {
  WRITING_CEFR_LEVELS,
  WRITING_FORMALITY,
  WRITING_TOPICS,
  type WritingCefr,
  type WritingFormality,
  type WritingKind,
  type WritingMeta,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import type { ExerciseFormValues } from "@/schemas/exercise";

type WritingEditorProps = {
  exerciseType: ExerciseFormValues["type"];
  /** When set, Cancel returns here and Save navigates here after persisting. */
  previewHref?: string;
  listHref?: string;
  folderId?: string | null;
  language?: string;
  /** Seed meta.kind when creating a new document (e.g. learning_note). */
  initialKind?: WritingKind | null;
  /** Prefill title when creating from Study Inbox. */
  initialTitle?: string | null;
  /** Prefill description when creating from Study Inbox. */
  initialDescription?: string | null;
  /** When set, mark this inbox item processed after a successful create. */
  fromInboxId?: string;
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
  listHref = "/writing",
  folderId = null,
  language = "en",
  initialKind = null,
  initialTitle = null,
  initialDescription = null,
  fromInboxId,
  initialData,
}: WritingEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("writing");
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const type = initialData?.type ?? exerciseType;

  const [title, setTitle] = useState(
    initialData?.title ?? initialTitle?.trim() ?? "",
  );
  const [description, setDescription] = useState(
    initialData?.description ?? initialDescription?.trim() ?? "",
  );
  const [editorState, setEditorState] = useState<WritingEditorState>(() => {
    const state = writingContentToEditorState(
      parseWritingContent(initialData?.content ?? undefined),
    );
    if (!initialData && initialKind) {
      return {
        ...state,
        meta: { ...state.meta, kind: initialKind },
      };
    }
    return state;
  });
  const { isPending: isSaving, tryBegin, release } = useMutationLock();
  const [imageUploading, setImageUploading] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [questionFeedback, setQuestionFeedback] =
    useState<QuestionAiFeedbackMap>({});

  const [baseline, setBaseline] = useState<WritingEditorSnapshot>(() => {
    const state = writingContentToEditorState(
      parseWritingContent(initialData?.content ?? undefined),
    );
    const seeded =
      !initialData && initialKind
        ? { ...state, meta: { ...state.meta, kind: initialKind } }
        : state;
    return buildWritingEditorSnapshot({
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      editorState: seeded,
    });
  });
  const baselineRef = useRef(baseline);
  const originalFieldsRef = useRef({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
  });
  const [isBaselineReady, setIsBaselineReady] = useState(
    () => !initialData?.id || editorState.mode === "question_set",
  );
  const isBaselineReadyRef = useRef(isBaselineReady);
  const hydrationCancelRef = useRef<(() => void) | null>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    title,
    description,
    editorState,
    type,
    id: initialData?.id,
  });

  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  useEffect(() => {
    isBaselineReadyRef.current = isBaselineReady;
  }, [isBaselineReady]);

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
      hydrationCancelRef.current?.();
    };
  }, []);

  const currentSnapshot = useMemo(
    () =>
      buildWritingEditorSnapshot({
        title,
        description,
        editorState,
      }),
    [title, description, editorState],
  );
  const hasRequiredContent = writingEditorHasRequiredContent(
    title,
    editorState,
  );
  const isDirty =
    isBaselineReady &&
    !writingEditorSnapshotsEqual(baseline, currentSnapshot);
  const canSave = hasRequiredContent && (initialData?.id ? isDirty : true);
  const canExport = writingEditorHasExportableContent(editorState);

  function adoptDescriptionBaseline(nextDescription: string) {
    const normalized = normalizeDescription(nextDescription);
    originalFieldsRef.current = {
      ...originalFieldsRef.current,
      description: normalized,
    };
    setDescription(normalized);
    latestRef.current = { ...latestRef.current, description: normalized };
    const snap = buildWritingEditorSnapshot({
      title: originalFieldsRef.current.title,
      description: normalized,
      editorState: latestRef.current.editorState,
    });
    setBaseline((prev) => {
      const next = { ...prev, description: snap.description };
      baselineRef.current = next;
      return next;
    });
  }

  function adoptRichDocBaseline(doc: JSONContent) {
    const nextState: WritingEditorState = {
      ...latestRef.current.editorState,
      mode: "rich_document",
      doc,
    };
    latestRef.current = { ...latestRef.current, editorState: nextState };
    setEditorState(nextState);
    const snap = buildWritingEditorSnapshot({
      title: originalFieldsRef.current.title,
      description: originalFieldsRef.current.description,
      editorState: nextState,
    });
    setBaseline(snap);
    baselineRef.current = snap;
    isBaselineReadyRef.current = true;
    setIsBaselineReady(true);
  }

  function handleRichEditorReady(nextEditor: Editor | null) {
    setEditor(nextEditor);
    hydrationCancelRef.current?.();
    hydrationCancelRef.current = null;
    if (!nextEditor) return;
    if (!initialData?.id) {
      isBaselineReadyRef.current = true;
      setIsBaselineReady(true);
      return;
    }
    if (latestRef.current.editorState.mode !== "rich_document") {
      isBaselineReadyRef.current = true;
      setIsBaselineReady(true);
      return;
    }
    hydrationCancelRef.current = afterEditorHydration(() => {
      adoptRichDocBaseline(nextEditor.getJSON());
    });
  }

  function buildPayload(
    nextTitle: string,
    nextDescription: string,
    nextState: WritingEditorState,
  ): ExerciseFormValues {
    return {
      title: nextTitle.trim(),
      description: nextDescription.trim()
        ? normalizeDescription(nextDescription)
        : "",
      type,
      content: serializeWritingContent(nextState) as Record<string, unknown>,
    };
  }

  async function persistExercise(showToast = true) {
    if (!tryBegin()) return;

    if (!title.trim()) {
      if (showToast) toast.error(t("titleRequired"));
      release();
      return;
    }

    if (
      editorState.mode === "question_set" &&
      !writingContentHasPrompt(editorState)
    ) {
      if (showToast) toast.error(t("promptRequired"));
      release();
      return;
    }

    if (!canSave) {
      release();
      return;
    }

    try {
      const {
        title: nextTitle,
        description: nextDescription,
        editorState: nextState,
      } = latestRef.current;
      const payload = buildPayload(nextTitle, nextDescription, nextState);

      if (initialData?.id) {
        await updateWritingDocument(initialData.id, payload);
        void queryClient.invalidateQueries({ queryKey: ["writing"] });
        try {
          router.prefetch(previewHref ?? listHref);
        } catch {
          // Prefetch is best-effort.
        }
        navigateAfterSuccess(router, previewHref ?? listHref, {
          toast: showToast ? () => toast.success(t("saved")) : undefined,
        });
      } else {
        const created = await createWritingDocument(payload, { folderId });
        if (fromInboxId) {
          try {
            await completeStudyInboxItem({
              id: fromInboxId,
              linkedEntityType: "writing",
              linkedEntityId: created.id,
            });
          } catch {
            // Create already succeeded; leave inbox item for a later retry.
          }
        }
        void queryClient.invalidateQueries({ queryKey: ["writing"] });
        try {
          router.prefetch(listHref);
        } catch {
          // Prefetch is best-effort.
        }
        navigateAfterSuccess(router, listHref, {
          toast: showToast ? () => toast.success(t("created")) : undefined,
        });
      }
    } catch (error) {
      release();
      const taken =
        error instanceof Error && error.message === "NAME_TAKEN";
      if (showToast || taken) {
        toast.error(taken ? t("titleTaken") : t("saveFailed"), {
          id: taken ? "writing-title-taken" : undefined,
        });
      }
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

    const snapshot = buildWritingEditorSnapshot({
      title: nextTitle,
      description: nextDescription,
      editorState: nextState,
    });
    if (writingEditorSnapshotsEqual(baselineRef.current, snapshot)) return;

    setIsAutosaving(true);
    try {
      await updateWritingDocument(
        id,
        buildPayload(nextTitle, nextDescription, nextState),
      );
      setBaseline(snapshot);
      baselineRef.current = snapshot;
      originalFieldsRef.current = {
        title: nextTitle,
        description: nextDescription,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "NAME_TAKEN") {
        toast.error(t("titleTaken"), { id: "writing-title-taken" });
      }
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
    setQuestionFeedback({});
    scheduleAutosave();
  }

  function applyQuestionAiSuggestion(
    questionId: string,
    suggestion: WritingAiSuggestion,
  ) {
    const next = replaceInQuestionSet(
      editorState,
      suggestion.original,
      suggestion.replacement,
      questionId,
    );
    if (!next.replaced) {
      toast.error(t("ai.applyFailed"));
      return;
    }
    setEditorState(next.state);
    setQuestionFeedback((current) =>
      removeSuggestionFromMap(
        current,
        questionId,
        suggestion.id ?? suggestion.original,
      ),
    );
    scheduleAutosave();
  }

  function skipQuestionAiSuggestion(questionId: string, suggestionId: string) {
    setQuestionFeedback((current) =>
      removeSuggestionFromMap(current, questionId, suggestionId),
    );
  }

  function setDoc(doc: JSONContent) {
    setEditorState((current) => {
      const next = { ...current, doc };
      latestRef.current = { ...latestRef.current, editorState: next };
      return next;
    });
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

    const snapshot = buildWritingEditorSnapshot({
      title,
      description,
      editorState: nextState,
    });
    if (writingEditorSnapshotsEqual(baselineRef.current, snapshot)) return;

    setIsAutosaving(true);

    try {
      await updateWritingDocument(
        initialData.id,
        buildPayload(title, description, nextState),
      );
      setBaseline(snapshot);
      baselineRef.current = snapshot;
      originalFieldsRef.current = {
        title,
        description,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "NAME_TAKEN") {
        toast.error(t("titleTaken"), { id: "writing-title-taken" });
      }
    } finally {
      setIsAutosaving(false);
    }
  }

  useRegisterShortcutAction("quickSave", () => {
    void persistExercise(true);
  });
  useRegisterShortcutAction(
    "quickView",
    () => {
      if (previewHref) router.replace(previewHref);
    },
    Boolean(previewHref),
  );
  useRegisterShortcutAction(
    "download",
    () => {
      setExportOpen(true);
    },
    canExport,
  );

  return (
    <div className="writing-sheet" data-writing-kind={editorState.mode}>
      <div className="writing-paper-chrome">
        <Link
          href={previewHref ?? listHref}
          className="writing-back text-ink dark:!text-white"
        >
          <ArrowLeft className="size-4 shrink-0 text-current" />
          {previewHref ? t("backToPreview") : t("backToList")}
        </Link>
        <div className="writing-paper-actions">
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
            disabled={!canExport}
            title={canExport ? undefined : t("export.empty")}
            className="route-quiet-action h-11 w-full sm:h-9 sm:w-auto"
            data-route-action="writing"
          >
            {t("export.button")}
          </LockedFeatureButton>
          <Button
            onClick={() => void persistExercise(true)}
            disabled={isSaving || imageUploading || !canSave}
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

      <p className="writing-kicker">
        {editorState.mode === "question_set"
          ? t("modes.questionSet")
          : t("modes.richDocument")}
      </p>
      <label className="sr-only" htmlFor="title">
        {t("documentTitle")}
      </label>
      <CapitalizedInput
        id="title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          scheduleAutosave();
        }}
        placeholder={t("titlePlaceholder")}
        className="writing-sheet-title"
      />
      <p className="writing-brand-lede">{t("formDescription")}</p>

      <div className="writing-sheet-meta">
        <WritingChipPicker
          labelId="writing-mode-label"
          label={t("mode")}
          value={editorState.mode}
          onChange={(value) => setMode(value as WritingMode)}
          options={[
            {
              value: "rich_document",
              kind: "rich_document",
              label: (
                <>
                  <FileText className="size-3.5" />
                  {t("modes.richDocument")}
                </>
              ),
            },
            {
              value: "question_set",
              kind: "question_set",
              label: (
                <>
                  <ListChecks className="size-3.5" />
                  {t("modes.questionSet")}
                </>
              ),
            },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {editorState.mode === "rich_document"
            ? t("modes.richDocumentHint")
            : t("modes.questionSetHint")}
        </p>

        <WritingChipPicker
          labelId="writing-cefr-label"
          label={tMeta("cefrLabel")}
          value={editorState.meta.cefrLevel ?? "none"}
          onChange={(value) =>
            setMeta({
              cefrLevel: value === "none" ? null : (value as WritingCefr),
            })
          }
          options={[
            { value: "none", label: tMeta("none") },
            ...WRITING_CEFR_LEVELS.map((level) => ({
              value: level,
              label: tMeta(`cefr.${level}`),
            })),
          ]}
        />

        <WritingChipPicker
          labelId="writing-formality-label"
          label={tMeta("formalityLabel")}
          value={editorState.meta.formality ?? "none"}
          onChange={(value) =>
            setMeta({
              formality:
                value === "none" ? null : (value as WritingFormality),
            })
          }
          options={[
            { value: "none", label: tMeta("none") },
            ...WRITING_FORMALITY.map((item) => ({
              value: item,
              label: tMeta(`formality.${item}`),
            })),
          ]}
        />

        <WritingChipPicker
          labelId="writing-topic-label"
          label={tMeta("topicLabel")}
          value={editorState.meta.topic ?? "none"}
          onChange={(value) =>
            setMeta({ topic: value === "none" ? null : value })
          }
          options={[
            { value: "none", label: tMeta("none") },
            ...WRITING_TOPICS.map((topic) => ({
              value: topic,
              label: resolveTopicLabel(topic, (key) => tTags(key)),
            })),
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          {t("documentDescription")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("optional")})
          </span>
        </Label>
        <DescriptionField
          id="description"
          value={description}
          onChange={(next) => {
            setDescription(next);
            scheduleAutosave();
          }}
          onReady={adoptDescriptionBaseline}
          placeholder={t("descriptionPlaceholder")}
          maxLength={2000}
        />
      </div>

          <WritingAiBar
            language={language}
            title={title}
            editorState={editorState}
            editor={editor}
            onQuestionFeedbackChange={setQuestionFeedback}
          />

          <div className="writing-sheet-surface">
          <ContentTransition transitionKey={editorState.mode}>
            {editorState.mode === "rich_document" ? (
              <div className="space-y-2">
                <Label>{t("content")}</Label>
                <RichTextEditor
                  content={editorState.doc}
                  placeholder={t("contentPlaceholder")}
                  language={language}
                  collapseStorageKey={
                    initialData?.id
                      ? `heading-collapse:writing:${initialData.id}`
                      : null
                  }
                  onChange={(next) => {
                    setDoc(next);
                    if (!isBaselineReadyRef.current) return;
                  }}
                  onEditorReady={handleRichEditorReady}
                  onImageUploadPendingChange={setImageUploading}
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
                questionFeedback={questionFeedback}
                onApplyAiSuggestion={applyQuestionAiSuggestion}
                onSkipAiSuggestion={skipQuestionAiSuggestion}
                onQuestionEdited={(questionId) =>
                  setQuestionFeedback((current) =>
                    clearQuestionFeedback(current, questionId),
                  )
                }
              />
            )}
          </ContentTransition>
          </div>

      <p className="text-sm text-muted-foreground">
        {previewHref
          ? t("editSaveHint")
          : isAutosaving
            ? t("autosaving")
            : initialData
              ? t("autosaveReady")
              : t("autosavePending")}
      </p>

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
