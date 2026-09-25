import { getTranslations } from "next-intl/server";
import { InboxView } from "@/components/inbox/inbox-view";
import { PageShell } from "@/components/layout/page-shell";
import { NoWorkspaceEmpty } from "@/components/workspace/no-workspace-empty";
import styles from "@/components/style/inbox/inbox.module.css";
import { mx } from "@/lib/css-module";
import { getStudyInboxItems } from "@/lib/actions/study-inbox";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function InboxPage() {
  const [t, workspace] = await Promise.all([
    getTranslations("inbox"),
    getActiveWorkspace(),
  ]);

  if (!workspace) {
    return (
      <PageShell className={mx(styles, "inbox-shell")}>
        <div
          className={`writing-atelier writing-atelier-empty inbox-atelier flex flex-col gap-10 ${mx(styles, "inbox-atelier")}`}
        >
          <header className="writing-hero">
            <div className="writing-hero-copy">
              <p className="writing-kicker">{t("eyebrow")}</p>
              <h1 className="writing-brand-title">{t("title")}</h1>
              <p className="writing-brand-lede">{t("disabledNoWorkspace")}</p>
            </div>
          </header>
          <NoWorkspaceEmpty />
        </div>
      </PageShell>
    );
  }

  const rows = await getStudyInboxItems("all");
  const items = rows.map((row) => ({
    id: row.id,
    content: row.content,
    note: row.note,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));

  return <InboxView items={items} initialFilter="unprocessed" />;
}
