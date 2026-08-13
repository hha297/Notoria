"use client";

import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTheoryNote } from "@/lib/actions/theory";
import {
  estimateReadingMinutes,
  isKnownTheoryCategory,
  parseTheoryContent,
} from "@/lib/theory/content";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type TheoryReaderProps = {
  id: string;
  title: string;
  content: unknown;
  updatedAt: string;
};

export function TheoryReader({
  id,
  title,
  content,
  updatedAt,
}: TheoryReaderProps) {
  const router = useRouter();
  const t = useTranslations("theory");
  const tCommon = useTranslations("common");
  const te = useTranslations("errors");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parsed = useMemo(() => parseTheoryContent(content), [content]);
  const categoryLabel = isKnownTheoryCategory(parsed.category)
    ? t(`categories.${parsed.category}`)
    : parsed.category;
  const minutes = estimateReadingMinutes(parsed.doc);

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTheoryNote(id);
        toast.success(t("deleted"));
        setDeleteOpen(false);
        router.replace("/theory");
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6 sm:space-y-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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

      <article className="card-surface space-y-6 p-4 sm:space-y-8 sm:p-6 md:p-8">
        <header className="space-y-3 border-b border-hairline-cloud pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryLabel}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {t("readingTime", { minutes })}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </span>
          </div>
          <h2 className="heading-md text-ink">{title}</h2>
          {parsed.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {parsed.description}
            </p>
          ) : null}
        </header>
        <RichTextEditor
          content={parsed.doc}
          editable={false}
          className="border-0 bg-transparent shadow-none"
        />
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
