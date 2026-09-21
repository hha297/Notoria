"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, Plus, Sparkles, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";
import { NewSpeakingDialog } from "@/components/speaking/new-speaking-dialog";
import { SpeakingSessionCard } from "@/components/speaking/speaking-session-card";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { useRegisterShortcutAction } from "@/components/preferences/shortcut-actions";
import { Button } from "@/components/ui/button";
import { ListPageLoading } from "@/components/layout/page-loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { speakingListQueryOptions } from "@/lib/query/options";
import { queryKeys } from "@/lib/query/keys";
import {
  isSpeakingJoinable,
  type SpeakingSessionListItem,
} from "@/lib/speaking/types";

type SpeakingViewProps = {
  workspaceId: string;
};

export function SpeakingView({ workspaceId }: SpeakingViewProps) {
  const t = useTranslations("speaking");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const sessionsQuery = useQuery(speakingListQueryOptions(workspaceId));
  const sessions = sessionsQuery.data ?? [];

  useRegisterShortcutAction("createNew", () => {
    setCreateOpen(true);
  });

  const stats = useMemo(() => {
    let completed = 0;
    let ready = 0;
    const topics = new Set<string>();
    for (const session of sessions) {
      if (session.status === "completed") completed += 1;
      if (isSpeakingJoinable(session.status)) ready += 1;
      if (session.topic) topics.add(session.topic);
    }
    return {
      total: sessions.length,
      completed,
      ready,
      topics: topics.size,
    };
  }, [sessions]);

  if (sessionsQuery.isPending) {
    return (
      <PageShell className="writing-atelier-shell speaking-atelier-shell">
        <ListPageLoading />
      </PageShell>
    );
  }

  const guide = [
    {
      icon: Sparkles,
      title: t("guide.pick.title"),
      body: t("guide.pick.body"),
    },
    {
      icon: Video,
      title: t("guide.call.title"),
      body: t("guide.call.body"),
    },
    {
      icon: MessageCircle,
      title: t("guide.review.title"),
      body: t("guide.review.body"),
    },
  ] as const;

  return (
    <PageShell className="writing-atelier-shell speaking-atelier-shell">
      <div className="writing-atelier speaking-atelier flex flex-col gap-10 lg:gap-12">
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">
              {t("title")}{" "}
              <span className="text-module-speak-fg">{t("highlight")}</span>
            </h1>
            <p className="writing-brand-lede">{t("description")}</p>
            <ul className="speaking-canopy mt-5" aria-label={t("stats.aria")}>
              <li className="speaking-canopy-item">
                <span className="speaking-canopy-value">{stats.total}</span>
                <span className="speaking-canopy-label">{t("stats.total")}</span>
              </li>
              <li className="speaking-canopy-item">
                <span className="speaking-canopy-value">{stats.completed}</span>
                <span className="speaking-canopy-label">
                  {t("stats.completed")}
                </span>
              </li>
              <li className="speaking-canopy-item">
                <span className="speaking-canopy-value">{stats.ready}</span>
                <span className="speaking-canopy-label">{t("stats.ready")}</span>
              </li>
              <li className="speaking-canopy-item">
                <span className="speaking-canopy-value">{stats.topics}</span>
                <span className="speaking-canopy-label">{t("stats.topics")}</span>
              </li>
            </ul>
          </div>
          <div className="writing-hero-actions">
            <ShowTutorialButton section="speaking" />
            <Button
              className="route-primary-cta"
              onClick={() => setCreateOpen(true)}
              data-tutorial="speaking-start"
            >
              <Plus className="size-4" />
              {sessions.length === 0 ? t("newCallFirst") : t("newCall")}
            </Button>
          </div>
        </header>

        <section className="speaking-guide" aria-label={t("guide.aria")}>
          {guide.map((item, index) => (
            <article key={item.title} className="speaking-guide-card">
              <div className="speaking-guide-index" aria-hidden="true">
                {index + 1}
              </div>
              <div className="speaking-guide-icon" aria-hidden="true">
                <item.icon className="size-4" />
              </div>
              <h2 className="speaking-guide-title">{item.title}</h2>
              <p className="speaking-guide-body">{item.body}</p>
            </article>
          ))}
        </section>

        {sessions.length === 0 ? (
          <div className="writing-empty-desk">
            <div className="mb-3 flex size-10 items-center justify-center text-module-speak-fg">
              <CheckCircle2 className="size-5" />
            </div>
            <p className="writing-empty-title">{t("emptyTitle")}</p>
            <p className="writing-brand-lede">{t("emptyDescription")}</p>
          </div>
        ) : (
          <section
            className="writing-workspace"
            data-tutorial="speaking-sessions"
          >
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <p className="writing-kicker mb-0">{t("mySessions")}</p>
              <p className="text-sm text-muted-foreground">
                {t("sessionHint")}
              </p>
            </div>
            <div className="writing-entry-list">
              {sessions.map((session) => (
                <SpeakingSessionCard
                  key={session.id}
                  session={session}
                  onDeleted={(id) =>
                    queryClient.setQueryData(
                      queryKeys.speaking.list(workspaceId),
                      (current: SpeakingSessionListItem[] | undefined) =>
                        current?.filter((item) => item.id !== id),
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <NewSpeakingDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageShell>
  );
}
