import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WritingEditor } from "@/components/writing/writing-editor";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { resolveFolderId } from "@/lib/actions/folders";
import { folderHref } from "@/lib/folders/paths";
import { getActiveWorkspace } from "@/lib/workspace";
import type { WritingKind } from "@/lib/writing/meta";

function parseKind(value: string | undefined): WritingKind | null {
  return value === "learning_note" || value === "free" ? value : null;
}

export default async function NewWritingPage({
  searchParams,
}: {
  searchParams: Promise<{
    folder?: string;
    kind?: string;
    prefill?: string;
    note?: string;
    fromInbox?: string;
  }>;
}) {
  const t = await getTranslations("writing");
  const workspace = await getActiveWorkspace();
  const { folder, kind, prefill, note, fromInbox } = await searchParams;
  const folderId = await resolveFolderId(folder, "writing");
  const listHref = folderHref("writing", folderId);
  const initialKind = parseKind(kind);
  const fromInboxId = fromInbox?.trim() || undefined;

  if (!workspace) {
    return (
      <div className="writing-sheet">
        <Link href={listHref} className="writing-back text-ink dark:!text-white">
          <ArrowLeft className="size-4 shrink-0 text-current" />
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
      initialKind={initialKind}
      initialTitle={prefill?.trim() || null}
      initialDescription={note?.trim() || null}
      fromInboxId={fromInboxId}
    />
  );
}
