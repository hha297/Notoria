import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import { TagManagerPage } from "@/components/vocabulary/tag-manager-page";
import { getActiveWorkspace } from "@/lib/workspace";

type TagPageProps = {
  searchParams: Promise<{
    tag?: string;
    from?: string;
  }>;
};

export default async function TagPage({ searchParams }: TagPageProps) {
  const t = await getTranslations("vocabulary.tagManager");
  const workspace = await getActiveWorkspace();
  const params = await searchParams;

  if (!workspace) {
    return (
      <PageShell className="tag-manager-shell">
        <div className="tag-manager-atelier writing-atelier writing-atelier-empty flex flex-col gap-10">
          <header className="writing-hero">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">{t("title")}</h1>
            <p className="writing-brand-lede">{t("disabledNoWorkspace")}</p>
          </header>
          <NoWorkspaceEmpty />
        </div>
      </PageShell>
    );
  }

  return (
    <TagManagerPage
      workspaceId={workspace.id}
      initialTagId={params.tag ?? null}
      backHref={params.from ?? "/settings"}
    />
  );
}
