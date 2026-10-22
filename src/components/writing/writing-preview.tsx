"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { DescriptionContent } from "@/components/form/description-content";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { DetailHeaderActions } from "@/components/shared/detail-header-actions";
import { ReviewLaterButton } from "@/components/review-later/review-later-button";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { Button } from "@/components/ui/button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import detailStyles from "@/components/style/workspace/detail.module.css";
import { removeCachedListItem } from "@/hooks/use-invalidate-workspace-queries";
import { deleteWritingDocument } from "@/lib/actions/writing";
import { mx } from "@/lib/css-module";
import { navigateAfterSuccess } from "@/lib/navigation/after-success";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";
import {
  parseWritingContent,
  writingContentToEditorState,
} from "@/lib/writing/content";
import { writingEditorHasExportableContent } from "@/lib/writing/export";

type WritingPreviewProps = {
  id: string;
  title: string;
  description?: string | null;
  content: unknown;
  backHref: string;
  reviewLaterMarked?: boolean;
};

export function WritingPreview({
  id,
  title,
  description,
  content,
  backHref,
  reviewLaterMarked = false,
}: WritingPreviewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("writing");
  const tMeta = useTranslations("writing.meta");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const te = useTranslations("errors");
  const [exportOpen, setExportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLeaving, setIsLeaving] = useState(false);

  const editorState = useMemo(
    () => writingContentToEditorState(parseWritingContent(content)),
    [content],
  );

  const sections = useMemo(
    () =>
      [...editorState.sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [editorState.sections],
  );

  const trimmedDescription = description?.trim() ?? "";
  const isQuestionSet = editorState.mode === "question_set";
  const canExport = writingEditorHasExportableContent(editorState);
  const meta = editorState.meta;

  const metaTags: Array<{ key: string; label: string; tone: string }> = [];
  if (meta.cefrLevel) {
    metaTags.push({
      key: `cefr-${meta.cefrLevel}`,
      label: tMeta(`cefr.${meta.cefrLevel}`),
      tone: "difficulty",
    });
  }
  if (meta.topic) {
    metaTags.push({
      key: `topic-${meta.topic}`,
      label: resolveTopicLabel(meta.topic, (key) => tTags(key)),
      tone: "topic",
    });
  }
  if (meta.formality) {
    metaTags.push({
      key: `formality-${meta.formality}`,
      label: tMeta(`formality.${meta.formality}`),
      tone: "formality",
    });
  }

  useRegisterShortcutAction("quickEdit", () => {
    router.push(`/writing/${id}/edit`);
  });
  useRegisterShortcutAction(
    "download",
    () => {
      setExportOpen(true);
    },
    canExport,
  );
  useRegisterShortcutAction("deleteItem", () => {
    setDeleteOpen(true);
  });

  function handleDelete() {
    if (isLeaving) return;
    startTransition(async () => {
      try {
        await deleteWritingDocument(id);
        removeCachedListItem(queryClient, "writing", id);
        setIsLeaving(true);
        setDeleteOpen(false);
        navigateAfterSuccess(router, "/writing", {
          toast: () => toast.success(t("deleted")),
        });
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <div
      className="writing-paper writing-atelier"
      data-writing-kind={
        editorState.meta.kind === "learning_note" &&
        editorState.mode === "rich_document"
          ? "learning_note"
          : editorState.mode
      }
    >
      <div
        className={mx(detailStyles, "shell")}
        data-detail="writing"
        data-writing-kind={
          editorState.meta.kind === "learning_note" &&
          editorState.mode === "rich_document"
            ? "learning_note"
            : editorState.mode
        }
      >
        <header className={mx(detailStyles, "header")}>
          <Link
            href={backHref}
            className={mx(detailStyles, "back writing-back")}
          >
            <ArrowLeft className="size-4 shrink-0" />
            {t("backToList")}
          </Link>
          <DetailHeaderActions
            leading={
              <ReviewLaterButton
                entityType="writing"
                entityId={id}
                titleSnapshot={title}
                marked={reviewLaterMarked}
              />
            }
            items={[
              {
                id: "export",
                label: t("export.button"),
                icon: Download,
                onSelect: () => setExportOpen(true),
                disabled: !canExport,
                requiresPro: true,
                className: "route-quiet-action",
                routeAction: "writing",
              },
              {
                id: "delete",
                label: tCommon("delete"),
                icon: Trash2,
                onSelect: () => setDeleteOpen(true),
                disabled: isPending,
                destructive: true,
              },
            ]}
          />
        </header>

        <section className={mx(detailStyles, "hero")}>
          <p className={mx(detailStyles, "kicker")}>
            {meta.kind === "learning_note"
              ? t("learningNote.badge")
              : isQuestionSet
                ? t("modes.questionSet")
                : t("modes.richDocument")}
          </p>
          <div className={mx(detailStyles, "titleRow")}>
            <h1 className={mx(detailStyles, "title wrap-break-word")}>
              {title}
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={mx(detailStyles, "titleEdit")}
              onClick={() => router.push(`/writing/${id}/edit`)}
              aria-label={t("edit")}
              title={t("edit")}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
          {metaTags.length > 0 ? (
            <div className={mx(detailStyles, "meta")}>
              {metaTags.map((tag) => (
                <span
                  key={tag.key}
                  data-tag-tone={tag.tone}
                  className={mx(detailStyles, "tag")}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}
          {trimmedDescription ? (
            <DescriptionContent
              value={trimmedDescription}
              className={mx(detailStyles, "lede")}
            />
          ) : null}
        </section>

        <div className={mx(detailStyles, "body")}>
          {editorState.mode === "rich_document" ? (
            <RichTextContent
              content={editorState.doc}
              className="border-0 bg-transparent shadow-none"
              collapseStorageKey={`heading-collapse:writing:${id}`}
            />
          ) : (
            <div className="space-y-12">
              {sections.map((section, sectionIndex) => {
                const questions = [...section.questions]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .filter((question) => question.prompt.trim().length > 0);

                if (questions.length === 0 && !section.title.trim()) {
                  return null;
                }

                return (
                  <section key={section.id} className="space-y-5">
                    <h2 className="font-heading text-lg font-semibold tracking-tight text-ink sm:text-xl">
                      {section.title.trim() ||
                        `${t("section")} ${sectionIndex + 1}`}
                    </h2>
                    <ol className="space-y-6">
                      {questions.map((question, questionIndex) => (
                        <li key={question.id} className="space-y-2">
                          <p className="text-base leading-[1.75] text-ink sm:text-lg">
                            <span className="writing-paper-num mr-2 font-heading font-medium">
                              {questionIndex + 1}.
                            </span>
                            {question.prompt.trim()}
                          </p>
                          {question.exampleAnswer.trim() ? (
                            <p className="pl-7 text-sm leading-relaxed text-muted-foreground sm:pl-8">
                              <span className="font-medium text-ink/70">
                                {t("export.exampleAnswerLabel")}:{" "}
                              </span>
                              {question.exampleAnswer.trim()}
                            </p>
                          ) : null}
                          {question.notes.trim() ? (
                            <p className="pl-7 text-sm leading-relaxed text-muted-foreground sm:pl-8">
                              <span className="font-medium text-ink/70">
                                {t("export.notesLabel")}:{" "}
                              </span>
                              {question.notes.trim()}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <WritingExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        description={trimmedDescription}
        editorState={editorState}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { title })}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        pending={isPending || isLeaving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
