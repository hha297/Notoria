import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { TheoryEditor } from "@/components/theory/theory-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { resolveFolderId } from "@/lib/actions/folders";
import { folderHref } from "@/lib/folders/paths";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function NewTheoryPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; prefill?: string; fromInbox?: string }>;
}) {
  const t = await getTranslations("theory");
  const workspace = await getActiveWorkspace();
  const { folder, prefill, fromInbox } = await searchParams;
  const folderId = await resolveFolderId(folder, "theory");
  const listHref = folderHref("theory", folderId);
  const fromInboxId = fromInbox?.trim() || undefined;

  if (!workspace) {
    return (
      <div className="writing-sheet theory-sheet">
        <Link href={listHref} className="writing-back text-ink dark:!text-white">
          <ArrowLeft className="size-4 shrink-0 text-current" />
          {t("backToList")}
        </Link>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <TheoryEditor
      folderId={folderId}
      language={workspace.language}
      listHref={listHref}
      initialTitle={prefill?.trim() || null}
      fromInboxId={fromInboxId}
    />
  );
}
