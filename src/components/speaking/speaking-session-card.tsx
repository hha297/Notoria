"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { deleteSpeakingSession } from "@/lib/actions/speaking";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import { isSpeakingJoinable } from "@/lib/speaking/types";
import type { SpeakingSessionListItem } from "@/lib/speaking/types";
import { type WritingCefr } from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

function statusVariant(status: SpeakingSessionListItem["status"]) {
  if (status === "completed") return "outline" as const;
  if (status === "cancelled") return "destructive" as const;
  if (status === "active") return "default" as const;
  return "secondary" as const;
}

type SpeakingSessionCardProps = {
  session: SpeakingSessionListItem;
  onDeleted?: (id: string) => void;
};

export function SpeakingSessionCard({
  session,
  onDeleted,
}: SpeakingSessionCardProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
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
        onDeleted?.(session.id);
      } catch (error) {
        toast.error(errorMessage(error));
      }
    });
  }

  const joinable = isSpeakingJoinable(session.status);
  const href = `/speaking/${session.id}`;
  const actionHref = joinable ? `/speaking/${session.id}/call` : href;

  const metaBits = [
    session.topic
      ? resolveTopicLabel(session.topic, (key) => tTags(key))
      : null,
    session.cefrLevel
      ? tMeta(`cefr.${session.cefrLevel as WritingCefr}`)
      : null,
    formatDistanceToNow(new Date(session.createdAt), { addSuffix: true }),
  ].filter(Boolean);

  return (
    <>
      <article className="writing-entry-wrap">
        <div className="writing-entry">
          <div className="writing-entry-body">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(session.status)}>
                {t(`status.${session.status}`)}
              </Badge>
            </div>
            <h3 className="writing-entry-title">
              <Link href={href}>{session.title}</Link>
            </h3>
            {metaBits.length > 0 ? (
              <p className="writing-kind-facts">
                {metaBits.map((bit, index) => (
                  <span key={`${bit}-${index}`}>
                    {index > 0 ? (
                      <span aria-hidden="true"> · </span>
                    ) : null}
                    <span>{bit}</span>
                  </span>
                ))}
              </p>
            ) : null}
            <div className="mt-2">
              <LinkButton
                href={actionHref}
                size="sm"
                className={
                  joinable ? "route-primary-cta" : "route-quiet-action"
                }
                data-route-action={joinable ? undefined : "speak"}
                variant={joinable ? "default" : "outline"}
              >
                {joinable
                  ? t("join")
                  : session.status === "processing"
                    ? t("viewProgress")
                    : t("open")}
              </LinkButton>
            </div>
          </div>
          <div className="writing-entry-actions">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="size-3.5" />
              <span className="sr-only">{tc("delete")}</span>
            </Button>
          </div>
        </div>
      </article>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", { title: session.title })}
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        pending={isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
