"use client";

import { Download, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { WritingExportDialog } from "@/components/writing/export-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  parseWritingContent,
  writingContentToEditorState,
} from "@/lib/writing/content";

type WritingPreviewProps = {
  id: string;
  title: string;
  content: unknown;
};

export function WritingPreview({ id, title, content }: WritingPreviewProps) {
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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

      <article className="card-surface space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
        <header className="space-y-3 border-b border-hairline-cloud pb-5">
          <Badge variant="secondary">
            {editorState.mode === "question_set"
              ? t("modes.questionSet")
              : t("modes.richDocument")}
          </Badge>
          <h2 className="heading-md text-ink">{title}</h2>
        </header>

        {editorState.mode === "rich_document" ? (
          <RichTextEditor
            content={editorState.doc}
            editable={false}
            className="border-0 bg-transparent shadow-none"
          />
        ) : (
          <div className="space-y-8">
            {sections.map((section, sectionIndex) => {
              const questions = [...section.questions]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .filter((question) => question.prompt.trim().length > 0);

              if (questions.length === 0 && !section.title.trim()) {
                return null;
              }

              return (
                <section key={section.id} className="space-y-4">
                  <h3 className="font-heading text-lg font-medium tracking-tight text-ink sm:text-xl">
                    {section.title.trim() ||
                      `${t("section")} ${sectionIndex + 1}`}
                  </h3>

                  <ol className="space-y-5">
                    {questions.map((question, questionIndex) => (
                      <li key={question.id} className="space-y-2">
                        <p className="text-sm font-medium text-ink sm:text-base">
                          <span className="mr-2 text-muted-foreground">
                            {questionIndex + 1}.
                          </span>
                          {question.prompt.trim()}
                        </p>
                        {question.exampleAnswer.trim() ? (
                          <p className="pl-5 text-sm text-muted-foreground sm:pl-6">
                            <span className="font-medium text-ink/70">
                              {t("export.exampleAnswerLabel")}:{" "}
                            </span>
                            {question.exampleAnswer.trim()}
                          </p>
                        ) : null}
                        {question.notes.trim() ? (
                          <p className="pl-5 text-sm text-muted-foreground sm:pl-6">
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
      </article>

      <WritingExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        editorState={editorState}
      />
    </div>
  );
}
