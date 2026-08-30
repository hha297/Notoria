"use client";

import { useState } from "react";
import { Plus, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { NewSpeakingDialog } from "@/components/speaking/new-speaking-dialog";
import { SpeakingSessionCard } from "@/components/speaking/speaking-session-card";
import { ShowTutorialButton } from "@/components/onboarding/show-tutorial-button";
import { Button } from "@/components/ui/button";
import type { SpeakingSessionListItem } from "@/lib/speaking/types";

type SpeakingViewProps = {
  sessions: SpeakingSessionListItem[];
};

export function SpeakingView({ sessions }: SpeakingViewProps) {
  const t = useTranslations("speaking");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        highlight={t("highlight")}
        description={t("description")}
      >
        <ShowTutorialButton section="speaking" />
        <Button onClick={() => setCreateOpen(true)} data-tutorial="speaking-start">
          <Plus className="size-4" />
          {t("newCall")}
        </Button>
      </PageHeader>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
            <Video className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-ink">{t("emptyTitle")}</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Button className="mt-5" onClick={() => setCreateOpen(true)} data-tutorial="speaking-start">
            <Plus className="size-4" />
            {t("newCallFirst")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4" data-tutorial="speaking-sessions">
          <h2 className="heading-md text-ink">{t("mySessions")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <SpeakingSessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      <NewSpeakingDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageShell>
  );
}
