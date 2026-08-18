"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, PhoneOff, Trash2, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LinkButton } from "@/components/ui/link-button";
import { deleteSpeakingSession, endSpeakingSession } from "@/lib/actions/speaking";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import { isSpeakingJoinable } from "@/lib/speaking/types";
import type { SpeakingSessionDetail } from "@/lib/speaking/types";
import {
  isKnownWritingTopic,
  type WritingCefr,
} from "@/lib/writing/meta";

type SpeakingSessionViewProps = {
  session: SpeakingSessionDetail;
};

export function SpeakingSessionView({ session }: SpeakingSessionViewProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
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
    startTransition(async () => {
      try {
        await deleteSpeakingSession(session.id);
        toast.success(t("deleted"));
        router.push("/speaking");
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
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
            {isKnownWritingTopic(session.topic)
              ? tMeta(`topics.${session.topic}`)
              : session.topic}
          </span>
        ) : null}
        {session.cefrLevel ? (
          <span className="text-sm text-muted-foreground">
            {tMeta(`cefr.${session.cefrLevel as WritingCefr}`)}
          </span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
        </span>
      </div>

      {session.notes ? (
        <p className="rounded-xl border border-hairline-cloud bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {session.notes}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
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

      {session.status === "processing" ? (
        <Card className="border-hairline-cloud">
          <CardHeader>
            <CardTitle className="text-lg">{t("processingTitle")}</CardTitle>
            <CardDescription>{t("processingDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {session.summary ? (
        <Card className="border-hairline-cloud">
          <CardHeader>
            <CardTitle className="text-lg">{t("feedbackTitle")}</CardTitle>
            <CardDescription>{t("feedbackDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-ink">
              {session.summary}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {session.transcript ? (
        <Card className="border-hairline-cloud">
          <CardHeader>
            <CardTitle className="text-lg">{t("transcriptTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-sm leading-relaxed text-ink">
              {session.transcript}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmDescription", { title: session.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
