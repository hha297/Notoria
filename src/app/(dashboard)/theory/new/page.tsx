import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { TheoryEditor } from "@/components/theory/theory-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { resolveFolderId } from "@/lib/actions/folders";
import { folderHref } from "@/lib/folders/paths";
import { getActiveWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function NewTheoryPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const t = await getTranslations("theory");
  const workspace = await getActiveWorkspace();
  const { folder } = await searchParams;
  const folderId = await resolveFolderId(folder, "theory");
  const listHref = folderHref("theory", folderId);

  if (!workspace) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pt-1 sm:space-y-10 sm:pt-2">
        <div className="space-y-6">
          <Link
            href={listHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Link>
          <PageHeader
            eyebrow={t("title")}
            title={t("newTitle")}
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
          href={listHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <PageHeader
          eyebrow={t("title")}
          title={t("newTitle")}
          description={t("formDescription")}
        />
      </div>
      <TheoryEditor folderId={folderId} />
    </div>
  );
}
