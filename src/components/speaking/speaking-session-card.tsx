"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Trash2, Video } from "lucide-react";
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
import { deleteSpeakingSession } from "@/lib/actions/speaking";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import { isSpeakingJoinable } from "@/lib/speaking/types";
import type { SpeakingSessionListItem } from "@/lib/speaking/types";
import {
  isKnownWritingTopic,
  type WritingCefr,
} from "@/lib/writing/meta";

function statusVariant(status: SpeakingSessionListItem["status"]) {
  if (status === "completed") return "outline" as const;
  if (status === "cancelled") return "destructive" as const;
  if (status === "active") return "default" as const;
  return "secondary" as const;
}

type SpeakingSessionCardProps = {
  session: SpeakingSessionListItem;
};

export function SpeakingSessionCard({ session }: SpeakingSessionCardProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tc = useTranslations("common");
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "SESSION_NOT_FOUND";
    return isSpeakingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.SESSION_NOT_FOUND");
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSpeakingSession(session.id);
        toast.success(t("deleted"));
        setDeleteOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const joinable = isSpeakingJoinable(session.status);

  return (
    <>
      <Card className="h-full border-hairline-cloud bg-card ring-hairline-cloud transition-shadow duration-200 hover:shadow-[0_8px_24px_-12px_rgba(31,22,51,0.18)] hover:ring-accent-lime/40">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl border border-hairline-cloud bg-muted/40">
              <Video className="size-5 text-ink" />
            </div>
            <Badge variant={statusVariant(session.status)}>
              {t(`status.${session.status}`)}
            </Badge>
          </div>
          <div className="group/title flex min-w-0 items-center gap-1">
            <CardTitle className="min-w-0 truncate text-lg text-ink">
              <Link href={`/speaking/${session.id}`} className="hover:underline">
                {session.title}
              </Link>
            </CardTitle>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-6 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-focus-within/title:opacity-100 group-hover/title:opacity-100 max-sm:opacity-100"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">{tc("delete")}</span>
            </Button>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-1.5 text-sm">
            {session.topic ? (
              <span>
                {isKnownWritingTopic(session.topic)
                  ? tMeta(`topics.${session.topic}`)
                  : session.topic}
              </span>
            ) : null}
            {session.topic && session.cefrLevel ? (
              <span aria-hidden="true">·</span>
            ) : null}
            {session.cefrLevel ? (
              <span>{tMeta(`cefr.${session.cefrLevel as WritingCefr}`)}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap items-center justify-between gap-3 pb-1">
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(session.createdAt), {
              addSuffix: true,
            })}
          </p>
          <LinkButton
            href={joinable ? `/speaking/${session.id}/call` : `/speaking/${session.id}`}
            size="sm"
            variant={joinable ? "default" : "outline"}
          >
            {joinable
              ? t("join")
              : session.status === "processing"
                ? t("viewProgress")
                : t("open")}
          </LinkButton>
        </CardContent>
      </Card>

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
    </>
  );
}
