"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { buildPageList } from "@/lib/vocabulary/display";
import featureStyles from "@/components/style/vocabulary/lexicon.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

type VocabularyPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function VocabularyPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: VocabularyPaginationProps) {
  const t = useTranslations("vocabulary");
  const pageItems = buildPageList(page, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        mx(featureStyles, "vocab-pagination"),
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {t("pageOf", { page, totalPages })}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageItems.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === page ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 min-w-8 px-2",
                item === page && "pointer-events-none",
              )}
              onClick={() => onPageChange(item)}
              aria-label={t("goToPage", { page: item })}
              aria-current={item === page ? "page" : undefined}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label={t("nextPage")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
