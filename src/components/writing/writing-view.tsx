"use client";

import { PenLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  WritingTable,
  type WritingListItem,
} from "@/components/writing/writing-table";

type WritingViewProps = {
  documents: WritingListItem[];
};

export function WritingView({ documents }: WritingViewProps) {
  const t = useTranslations("writing");

  if (documents.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={t("title")}
          title={t("title")}
          highlight={t("studio")}
          description={t("description")}
        >
          <LinkButton href="/writing/new">
            <Plus className="size-4" />
            {t("create")}
          </LinkButton>
        </PageHeader>

        <div className="empty-state">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
            <PenLine className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-ink">{t("emptyTitle")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <LinkButton href="/writing/new" className="mt-5">
            <Plus className="size-4" />
            {t("createFirst")}
          </LinkButton>
        </div>
      </div>
    );
  }

  return <WritingTable documents={documents} />;
}
