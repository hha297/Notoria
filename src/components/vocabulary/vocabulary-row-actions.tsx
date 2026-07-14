"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteVocabularyWord } from "@/lib/actions/vocabulary";
import { cn } from "@/lib/utils";

type VocabularyRowActionsProps = {
  wordId: string;
};

export function VocabularyRowActions({ wordId }: VocabularyRowActionsProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tv = useTranslations("vocabulary");
  const te = useTranslations("errors");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(tv("deleteConfirm"))) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteVocabularyWord(wordId);
        toast.success(tv("deleted"));
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Link
        href={`/vocabulary/${wordId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
      >
        <Pencil className="size-4" />
        <span className="sr-only">{t("edit")}</span>
      </Link>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">{t("delete")}</span>
      </Button>
    </div>
  );
}
