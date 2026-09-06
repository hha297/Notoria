"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VocabularyForm,
  type VocabularyFormInitialData,
} from "@/components/vocabulary/vocabulary-form";
import type { VocabularySynonymRef } from "@/lib/vocabulary/synonyms";

type VocabularyQuickEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  initialData: VocabularyFormInitialData | null;
  existingCustomTags: string[];
  synonymOptions: VocabularySynonymRef[];
};

export function VocabularyQuickEditDialog({
  open,
  onOpenChange,
  language,
  initialData,
  existingCustomTags,
  synonymOptions,
}: VocabularyQuickEditDialogProps) {
  const router = useRouter();
  const t = useTranslations("vocabulary");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,52rem)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl sm:p-0">
        <DialogHeader className="shrink-0 space-y-1 border-b border-hairline-cloud px-4 py-4 pr-12 sm:px-6">
          <DialogTitle>{t("editWord")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {open && initialData ? (
            <VocabularyForm
              key={initialData.id}
              mode="modal"
              language={language}
              existingCustomTags={existingCustomTags}
              synonymOptions={synonymOptions}
              initialData={initialData}
              onCancel={() => onOpenChange(false)}
              onSuccess={() => {
                onOpenChange(false);
                router.refresh();
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
