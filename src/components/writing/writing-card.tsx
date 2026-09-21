"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import { DescriptionContent } from "@/components/form/description-content";
import { WritingMetaBadges } from "@/components/writing/writing-meta-badges";
import { WritingRowActions } from "@/components/writing/writing-row-actions";
import type { WritingListMeta } from "@/lib/writing/content";

export type WritingListItem = {
  id: string;
  title: string;
  description?: string | null;
  listMeta: WritingListMeta;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type WritingCardProps = {
  document: WritingListItem;
  workspaceId: string;
  variant?: "feature" | "entry";
};

function WritingKindFacts({
  document,
}: {
  document: WritingListItem;
}) {
  const t = useTranslations("writing");
  const listMeta = document.listMeta;
  const isQuestionSet = listMeta.mode === "question_set";

  return (
    <p className="writing-kind-facts">
      {isQuestionSet ? (
        <>
          <span>{t("sectionCount", { count: listMeta.sectionCount })}</span>
          <span aria-hidden="true"> · </span>
          <span>{t("questionCount", { count: listMeta.questionCount })}</span>
        </>
      ) : (
        <span>{t("modes.richDocument")}</span>
      )}
      <span aria-hidden="true"> · </span>
      <span>
        {formatDistanceToNow(new Date(document.updatedAt), {
          addSuffix: true,
        })}
      </span>
    </p>
  );
}

export function WritingCard({
  document,
  workspaceId,
  variant = "entry",
}: WritingCardProps) {
  const t = useTranslations("writing");
  const listMeta = document.listMeta;
  const isQuestionSet = listMeta.mode === "question_set";
  const href = `/writing/${document.id}`;

  if (variant === "feature") {
    return (
      <FolderItemDrag id={document.id}>
        <article
          className="writing-feature"
          data-writing-kind={listMeta.mode}
        >
          <div className="writing-feature-copy">
            <h2 className="writing-feature-title">
              <Link
                href={href}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                {document.title}
              </Link>
            </h2>
            {document.description?.trim() ? (
              <DescriptionContent
                value={document.description}
                clampLines={4}
                className="writing-feature-excerpt"
              />
            ) : null}
            <WritingKindFacts document={document} />
            <div className="mt-3">
              <WritingMetaBadges meta={listMeta.meta} />
            </div>
            <Link
              href={href}
              className="writing-open-link"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {t("openWriting")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="writing-feature-tools">
            <WritingRowActions
              id={document.id}
              title={document.title}
              description={document.description}
              folderId={document.folderId}
              workspaceId={workspaceId}
              canExport={listMeta.hasExportableContent}
            />
          </div>
        </article>
      </FolderItemDrag>
    );
  }

  return (
    <FolderItemDrag id={document.id} className="writing-entry-wrap">
      <article
        className="writing-entry"
        data-writing-kind={listMeta.mode}
      >
        <div className="writing-entry-body">
          <h3 className="writing-entry-title">
            <Link
              href={href}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              {document.title}
            </Link>
          </h3>
          {!isQuestionSet && document.description?.trim() ? (
            <DescriptionContent
              value={document.description}
              clampLines={2}
              className="writing-entry-excerpt"
            />
          ) : null}
          <WritingKindFacts document={document} />
          <div className="mt-1.5">
            <WritingMetaBadges meta={listMeta.meta} />
          </div>
        </div>
        <div className="writing-entry-actions">
          <WritingRowActions
            id={document.id}
            title={document.title}
            description={document.description}
            folderId={document.folderId}
            workspaceId={workspaceId}
            canExport={listMeta.hasExportableContent}
          />
        </div>
      </article>
    </FolderItemDrag>
  );
}
