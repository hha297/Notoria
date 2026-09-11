"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
};

export function WritingCard({ document, workspaceId }: WritingCardProps) {
  const t = useTranslations("writing");
  const listMeta = document.listMeta;

  return (
    <FolderItemDrag id={document.id} className="h-full">
      <Card className="relative h-full cursor-pointer border-hairline-cloud bg-card ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-accent-lime/40">
        <Link
          href={`/writing/${document.id}`}
          className="absolute inset-0 z-0"
          aria-label={document.title}
        />
        <CardHeader className="relative z-10 gap-3 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-hairline-cloud bg-muted/40">
              <PenLine className="size-5 text-ink" />
            </div>
            <div className="pointer-events-auto">
              <WritingRowActions
                id={document.id}
                title={document.title}
                description={document.description}
                folderId={document.folderId}
                workspaceId={workspaceId}
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <CardTitle className="line-clamp-2 min-h-[3.25rem] text-lg leading-snug text-ink">
              {document.title}
            </CardTitle>
            <div className="min-h-[3.75rem]">
              {document.description?.trim() ? (
                <DescriptionContent
                  value={document.description}
                  clampLines={3}
                  className="text-sm text-muted-foreground"
                />
              ) : null}
            </div>
            <WritingMetaBadges meta={listMeta.meta} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10 mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pb-1 text-xs text-muted-foreground pointer-events-none">
          {listMeta.mode === "question_set" ? (
            <>
              <span>
                {t("sectionCount", { count: listMeta.sectionCount })}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t("questionCount", { count: listMeta.questionCount })}
              </span>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>
            {formatDistanceToNow(new Date(document.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </CardContent>
      </Card>
    </FolderItemDrag>
  );
}
