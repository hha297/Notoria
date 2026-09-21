"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Clock, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LockedFeatureButton } from "@/components/billing/locked-feature-button";
import { RichTextContent } from "@/components/editor/rich-text-content";
import { DescriptionContent } from "@/components/form/description-content";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { TheoryExportDialog } from "@/components/theory/export-dialog";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { deleteTheoryNote } from "@/lib/actions/theory";
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
};

export function TheoryReader({
  id,
  title,
  content,
  updatedAt,
  backHref,
}: TheoryReaderProps) {
  const router = useRouter();
  const t = useTranslations("theory");
  const tCommon = useTranslations("common");
  const te = useTranslations("errors");
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
    <div className="writing-paper theory-paper" data-theory-category={parsed.category || undefined}>
      <div className="writing-paper-chrome">
        <Link href={backHref} className="writing-back">
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
            className="route-quiet-action h-11 w-full sm:h-9 sm:w-auto"
            data-route-action="theory"
          >
            {t("export.button")}
          </LockedFeatureButton>
          <LinkButton
            href={`/theory/${id}/edit`}
            size="lg"
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <Pencil className="size-4" />
            {t("edit")}
          </LinkButton>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setDeleteOpen(true)}
            className="h-11 w-full sm:h-9 sm:w-auto"
          >
            <Trash2 className="size-4" />
            {tCommon("delete")}
          </Button>
        </div>
      </div>

      <article
        className="writing-paper-page"
        data-theory="note"
        data-theory-category={parsed.category || undefined}
      >
        <p className="writing-kicker">{categoryLabel}</p>
        <h1 className="writing-paper-title wrap-break-word">{title}</h1>
        <p className="writing-kind-facts">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {t("readingTime", { minutes })}
          </span>
          <span aria-hidden="true"> · </span>
          <span>
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </p>
        {parsed.description ? (
          <DescriptionContent
            value={parsed.description}
            className="writing-feature-excerpt mt-3"
          />
        ) : null}
        <div className="writing-paper-body">
          <RichTextContent
            content={parsed.doc}
            className="border-0 bg-transparent p-0 shadow-none"
            collapseStorageKey={`heading-collapse:theory:${id}`}
          />
        </div>
      </article>

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
