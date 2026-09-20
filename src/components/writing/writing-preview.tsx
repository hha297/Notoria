"use client";

import Link from "next/link";
import { ArrowLeft, Download, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { DescriptionContent } from "@/components/form/description-content";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { WritingMetaBadges } from "@/components/writing/writing-meta-badges";
import { LinkButton } from "@/components/ui/link-button";
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
};

export function WritingPreview({
  id,
  title,
  description,
  content,
  backHref,
}: WritingPreviewProps) {
  const t = useTranslations("writing");
  const [exportOpen, setExportOpen] = useState(false);

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

  return (
    <div className="writing-paper">
      <div className="writing-paper-chrome">
        <Link
          href={backHref}
          className="writing-back"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <div className="writing-paper-actions">
          <LockedFeatureButton
            type="button"
            variant="outline"
            size="lg"
            icon={<Download className="size-4" />}
            onClick={() => setExportOpen(true)}
            disabled={!canExport}
            title={canExport ? undefined : t("export.empty")}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            {t("export.button")}
          </LockedFeatureButton>
          <LinkButton
            href={`/writing/${id}/edit`}
            size="lg"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <Pencil className="size-4" />
            {t("edit")}
          </LinkButton>
        </div>
      </div>

      <article
        className="writing-paper-page"
        data-writing-kind={editorState.mode}
      >
        <p className="writing-kicker">
          {isQuestionSet ? t("modes.questionSet") : t("modes.richDocument")}
        </p>
        <h1 className="writing-paper-title wrap-break-word">{title}</h1>
        <WritingMetaBadges meta={editorState.meta} />
        {trimmedDescription ? (
          <DescriptionContent
            value={trimmedDescription}
            className="writing-feature-excerpt mt-3"
          />
        ) : null}

        <div className="writing-paper-body">
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
      </article>

      <WritingExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        description={trimmedDescription}
        editorState={editorState}
      />
    </div>
  );
}
