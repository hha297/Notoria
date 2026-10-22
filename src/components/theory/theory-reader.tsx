"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Clock, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { DescriptionContent } from "@/components/form/description-content";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { DetailHeaderActions } from "@/components/shared/detail-header-actions";
import { ReviewLaterButton } from "@/components/review-later/review-later-button";
import { TheoryExportDialog } from "@/components/theory/export-dialog";
import { Button } from "@/components/ui/button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import detailStyles from "@/components/style/workspace/detail.module.css";
import { useDateFnsLocale } from "@/hooks/use-date-fns-locale";
import { removeCachedListItem } from "@/hooks/use-invalidate-workspace-queries";
import { deleteTheoryNote } from "@/lib/actions/theory";
import { mx } from "@/lib/css-module";
import { navigateAfterSuccess } from "@/lib/navigation/after-success";
import {
  estimateReadingMinutes,
  isKnownTheoryCategory,
  parseTheoryContent,
} from "@/lib/theory/content";
import { theoryDocHasExportableContent } from "@/lib/writing/export";

type TheoryReaderProps = {
  id: string;
  title: string;
  content: unknown;
  updatedAt: string;
  backHref: string;
  reviewLaterMarked?: boolean;
};

export function TheoryReader({
  id,
  title,
  content,
  updatedAt,
  backHref,
  reviewLaterMarked = false,
}: TheoryReaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("theory");
  const tCommon = useTranslations("common");
  const te = useTranslations("errors");
  const dateLocale = useDateFnsLocale();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLeaving, setIsLeaving] = useState(false);

  const parsed = useMemo(() => parseTheoryContent(content), [content]);
  const categoryLabel = isKnownTheoryCategory(parsed.category)
    ? t(`categories.${parsed.category}`)
    : parsed.category;
  const minutes = estimateReadingMinutes(parsed.doc);
  const canExport = theoryDocHasExportableContent(parsed.doc);

  useRegisterShortcutAction("quickEdit", () => {
    router.push(`/theory/${id}/edit`);
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
        await deleteTheoryNote(id);
        removeCachedListItem(queryClient, "theory", id);
        setIsLeaving(true);
        setDeleteOpen(false);
        navigateAfterSuccess(router, "/theory", {
          toast: () => toast.success(t("deleted")),
        });
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <div
      className="writing-paper theory-paper theory-atelier"
      data-theory-category={parsed.category || undefined}
    >
      <div className={mx(detailStyles, "shell")} data-detail="theory">
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
                entityType="theory"
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
                routeAction: "theory",
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
          <p className={mx(detailStyles, "kicker")}>{categoryLabel}</p>
          <div className={mx(detailStyles, "titleRow")}>
            <h1 className={mx(detailStyles, "title wrap-break-word")}>
              {title}
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className={mx(detailStyles, "titleEdit")}
              onClick={() => router.push(`/theory/${id}/edit`)}
              aria-label={t("edit")}
              title={t("edit")}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
          <div className={mx(detailStyles, "meta")}>
            <span className={mx(detailStyles, "tag")}>
              <Clock className="size-3.5" aria-hidden="true" />
              {t("readingTime", { minutes })}
            </span>
            <span className={mx(detailStyles, "tag")}>
              {formatDistanceToNow(new Date(updatedAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
          {parsed.description ? (
            <DescriptionContent
              value={parsed.description}
              className={mx(detailStyles, "lede")}
            />
          ) : null}
        </section>

        <div className={mx(detailStyles, "body")}>
          <RichTextContent
            content={parsed.doc}
            className="border-0 bg-transparent p-0 shadow-none"
            collapseStorageKey={`heading-collapse:theory:${id}`}
          />
        </div>
      </div>

      <TheoryExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={title}
        description={parsed.description}
        doc={parsed.doc}
        category={parsed.category}
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
