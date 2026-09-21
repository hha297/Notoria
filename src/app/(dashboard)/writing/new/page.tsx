import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WritingEditor } from "@/components/writing/writing-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { resolveFolderId } from "@/lib/actions/folders";
import { folderHref } from "@/lib/folders/paths";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function NewWritingPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const t = await getTranslations("writing");
  const workspace = await getActiveWorkspace();
  const { folder } = await searchParams;
  const folderId = await resolveFolderId(folder, "writing");
  const listHref = folderHref("writing", folderId);

  if (!workspace) {
    return (
      <div className="writing-sheet">
        <Link href={listHref} className="writing-back">
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <NoWorkspaceEmpty />
      </div>
    );
  }

  return (
    <WritingEditor
      exerciseType="WRITING"
      language={workspace.language}
      folderId={folderId}
      listHref={listHref}
    />
  );
}
