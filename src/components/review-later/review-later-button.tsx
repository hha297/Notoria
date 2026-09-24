"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleReviewLater } from "@/lib/actions/review-later";
import { cn } from "@/lib/utils";

type ReviewLaterButtonProps = {
  entityType: string;
  entityId: string;
  titleSnapshot?: string | null;
  marked?: boolean;
  className?: string;
};

export function ReviewLaterButton({
  entityType,
  entityId,
  titleSnapshot,
  marked: initialMarked = false,
  className,
}: ReviewLaterButtonProps) {
  const t = useTranslations("reviewLater");
  const te = useTranslations("errors");
  const [marked, setMarked] = useState(initialMarked);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !marked;
    setMarked(next);
    startTransition(async () => {
      try {
        const result = await toggleReviewLater({
          entityType,
          entityId,
          titleSnapshot,
          marked: next,
        });
        setMarked(result.marked);
      } catch {
        setMarked(!next);
        toast.error(te("generic"));
      }
    });
  }

  const Icon = marked ? BookmarkCheck : Bookmark;
  const label = marked ? t("remove") : t("add");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn(className)}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={label}
      aria-pressed={marked}
      title={label}
    >
      <Icon
        className={cn("size-4", marked && "fill-current text-module-home-fg")}
      />
    </Button>
  );
}
