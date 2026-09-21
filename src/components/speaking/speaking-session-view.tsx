"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2, PhoneOff, Trash2, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DescriptionContent } from "@/components/form/description-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinkButton } from "@/components/ui/link-button";
import featureStyles from "@/components/style/speaking/session.module.css";
import sheetStyles from "@/components/style/workspace/sheet.module.css";
import { deleteSpeakingSession, endSpeakingSession } from "@/lib/actions/speaking";
import { mx } from "@/lib/css-module";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import { isSpeakingJoinable } from "@/lib/speaking/types";
import type { SpeakingSessionDetail } from "@/lib/speaking/types";
import { type WritingCefr } from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

type SpeakingSessionViewProps = {
  session: SpeakingSessionDetail;
};

export function SpeakingSessionView({ session }: SpeakingSessionViewProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isLeaving, setIsLeaving] = useState(false);
  const joinable = isSpeakingJoinable(session.status);

  useEffect(() => {
    if (session.status !== "processing") return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [router, session.status]);

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "SESSION_NOT_FOUND";
    return isSpeakingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.SESSION_NOT_FOUND");
  }

  function handleEnd() {
    startTransition(async () => {
      try {
        await endSpeakingSession(session.id);
        toast.success(t("ended"));
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  function handleDelete() {
    if (isLeaving) return;
    startTransition(async () => {
      try {
        await deleteSpeakingSession(session.id);
        setIsLeaving(true);
        setDeleteOpen(false);
        router.push("/speaking");
        toast.success(t("deleted"));
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <div className="writing-paper speaking-paper">
      <div className="writing-paper-chrome">
        <Link href="/speaking" className="writing-back">
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <div className="writing-paper-actions">
          {joinable ? (
            <LinkButton href={`/speaking/${session.id}/call`}>
              <Video className="size-4" />
              {t("join")}
            </LinkButton>
          ) : null}
          {session.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              className="route-quiet-action"
              data-route-action="speak"
              onClick={handleEnd}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneOff className="size-4" />
              )}
              {t("endSession")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      <article className="writing-paper-page">
        <p className="writing-kicker">{t("title")}</p>
        <h1 className="writing-paper-title wrap-break-word">{session.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant={
              session.status === "completed"
                ? "outline"
                : session.status === "active"
                  ? "default"
                  : "secondary"
            }
          >
            {t(`status.${session.status}`)}
          </Badge>
          {session.topic ? (
            <span className="text-sm text-muted-foreground">
              {resolveTopicLabel(session.topic, (key) => tTags(key))}
            </span>
          ) : null}
          {session.cefrLevel ? (
            <span className="text-sm text-muted-foreground">
              {tMeta(`cefr.${session.cefrLevel as WritingCefr}`)}
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(session.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="writing-brand-lede mt-3">{t("sessionDescription")}</p>

        {session.notes ? (
          <div className={mx(featureStyles, "speaking-panel mt-6")}>
            <DescriptionContent value={session.notes} />
          </div>
        ) : null}

        <div className="mt-6">
          {session.status === "processing" ? (
            <div className={mx(featureStyles, "speaking-panel")}>
              <h2 className={mx(featureStyles, "speaking-panel-title")}>{t("processingTitle")}</h2>
              <p className={mx(featureStyles, "speaking-panel-lede")}>{t("processingDescription")}</p>
            </div>
          ) : null}

          {session.summary ? (
            <div className={mx(featureStyles, "speaking-panel")}>
              <h2 className={mx(featureStyles, "speaking-panel-title")}>{t("feedbackTitle")}</h2>
              <p className={mx(featureStyles, "speaking-panel-lede")}>{t("feedbackDescription")}</p>
              <div className={mx(featureStyles, "speaking-panel-body prose prose-sm max-w-none whitespace-pre-wrap text-ink")}>
                {session.summary}
              </div>
            </div>
          ) : null}

          {session.transcript ? (
            <div className={mx(featureStyles, "speaking-panel")}>
              <h2 className={mx(featureStyles, "speaking-panel-title")}>{t("transcriptTitle")}</h2>
              <div className={mx(featureStyles, "speaking-panel-body")}>
                <pre className={mx(featureStyles, "speaking-transcript")}>{session.transcript}</pre>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          showCloseButton={!isPending && !isLeaving}
          className={mx(sheetStyles, "workspace-sheet sm:max-w-md")}
          data-sheet-route="speak"
        >
          <DialogHeader className={mx(sheetStyles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
            <p className={mx(sheetStyles, "workspace-sheet-kicker")}>{t("title")}</p>
            <DialogTitle className={mx(sheetStyles, "workspace-sheet-title")}>
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className={mx(sheetStyles, "workspace-sheet-lede")}>
              {t("deleteConfirmDescription", { title: session.title })}
            </DialogDescription>
          </DialogHeader>
          <div className={mx(sheetStyles, "workspace-sheet-footer")}>
            <Button
              type="button"
              variant="outline"
              className={mx(sheetStyles, "workspace-sheet-cancel")}
              onClick={() => setDeleteOpen(false)}
              disabled={isPending || isLeaving}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={mx(sheetStyles, "workspace-sheet-cta")}
              onClick={handleDelete}
              disabled={isPending || isLeaving}
            >
              {isPending || isLeaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
