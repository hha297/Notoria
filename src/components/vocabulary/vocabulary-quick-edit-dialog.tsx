"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ListPageLoading } from "@/components/layout/page-loading";
import {
  vocabularyDetailQueryOptions,
} from "@/lib/query/options";

const VocabularyForm = dynamic(
  () =>
    import("@/components/vocabulary/vocabulary-form").then(
      (mod) => mod.VocabularyForm,
    ),
  {
    loading: () => <ListPageLoading />,
    ssr: false,
  },
);

type VocabularyQuickEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  workspaceId: string;
  wordId: string | null;
  onSuccess?: () => void;
};

export function VocabularyQuickEditDialog({
  open,
  onOpenChange,
  language,
  workspaceId,
  wordId,
  onSuccess,
}: VocabularyQuickEditDialogProps) {
  const t = useTranslations("vocabulary");
  const detailQuery = useQuery({
    ...vocabularyDetailQueryOptions(workspaceId, wordId ?? ""),
    enabled: open && Boolean(workspaceId && wordId),
  });

  const initialData = detailQuery.data
    ? {
        id: detailQuery.data.id,
        word: detailQuery.data.word,
        partOfSpeech: detailQuery.data.partOfSpeech,
        notes: detailQuery.data.notes,
        synonymRefs: detailQuery.data.synonymRefs,
        meanings: detailQuery.data.meanings,
        examples: detailQuery.data.examples,
        tags: detailQuery.data.tags.map((tag) => ({ tag: tag.tag })),
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,56rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:p-0 lg:max-w-5xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-hairline-cloud px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{t("editWord")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {open && wordId && initialData ? (
            <VocabularyForm
              key={initialData.id}
              mode="modal"
              language={language}
              workspaceId={workspaceId}
              initialData={initialData}
              onCancel={() => onOpenChange(false)}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          ) : open ? (
            <ListPageLoading />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
