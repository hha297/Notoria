import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { WritingEditor } from "@/components/writing/writing-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function NewWritingPage() {
  const t = await getTranslations("writing");
  const workspace = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
        <div className="space-y-6">
          <Link
            href="/writing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Link>
          <PageHeader
            eyebrow={t("title")}
            title={t("newTitle")}
            highlight={t("studio")}
            description={t("disabledNoWorkspace")}
          />
        </div>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
      <div className="space-y-6">
        <Link
          href="/writing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("newTitle")}
          highlight={t("studio")}
          description={t("formDescription")}
        />
      </div>
      <WritingEditor exerciseType="WRITING" />
    </div>
  );
}
