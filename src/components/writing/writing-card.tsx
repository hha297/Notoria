"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { FolderItemDrag } from "@/components/folders/folder-dnd";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WritingMetaBadges } from "@/components/writing/writing-meta-badges";
import { WritingRowActions } from "@/components/writing/writing-row-actions";
import { getWritingListMeta } from "@/lib/writing/content";

export type WritingListItem = {
  id: string;
  title: string;
  description?: string | null;
  content: unknown;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

type WritingCardProps = {
  document: WritingListItem;
};

export function WritingCard({ document }: WritingCardProps) {
  const t = useTranslations("writing");
  const listMeta = getWritingListMeta(document.content);

  return (
    <FolderItemDrag id={document.id} className="h-full">
      <Card className="h-full border-hairline-cloud bg-card ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-accent-lime/40">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-hairline-cloud bg-muted/40">
              <PenLine className="size-5 text-ink" />
            </div>
            <WritingRowActions
              id={document.id}
              title={document.title}
              description={document.description}
              content={document.content}
              folderId={document.folderId}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-lg text-ink">
              <Link
                href={`/writing/${document.id}`}
                className="hover:underline"
              >
                {document.title}
              </Link>
            </CardTitle>
            {document.description?.trim() ? (
              <CardDescription className="line-clamp-3 text-sm leading-relaxed">
                {document.description.trim()}
              </CardDescription>
            ) : null}
            <WritingMetaBadges meta={listMeta.meta} />
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pb-1 text-xs text-muted-foreground">
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
