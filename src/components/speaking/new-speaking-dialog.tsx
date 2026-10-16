"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QuotaLockButton } from "@/components/billing/quota-lock-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WritingChipPicker } from "@/components/writing/writing-chip-picker";
import styles from "@/components/style/workspace/sheet.module.css";
import { createSpeakingSession } from "@/lib/actions/speaking";
import { mx } from "@/lib/css-module";
import { isSpeakingErrorCode } from "@/lib/speaking/errors";
import { useQuotaLockMessage } from "@/hooks/use-quota-lock-message";
import {
  DEFAULT_TOPIC_ID,
  WRITING_CEFR_LEVELS,
  WRITING_TOPICS,
  type WritingCefr,
} from "@/lib/writing/meta";
import { resolveTopicLabel } from "@/lib/taxonomy/topics";

type NewSpeakingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewSpeakingDialog({
  open,
  onOpenChange,
}: NewSpeakingDialogProps) {
  const t = useTranslations("speaking");
  const tMeta = useTranslations("speaking.meta");
  const tTags = useTranslations("tags");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const speakingQuota = useQuotaLockMessage("ai_meeting");
  const [title, setTitle] = useState("");
  const [cefrLevel, setCefrLevel] = useState("b1");
  const [topic, setTopic] = useState<string>(DEFAULT_TOPIC_ID);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setTitle("");
    setCefrLevel("b1");
    setTopic(DEFAULT_TOPIC_ID);
    setNotes("");
  }

  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : "STREAM_CALL_FAILED";
    if (code === "AI_QUOTA_EXCEEDED") return speakingQuota.message;
    return isSpeakingErrorCode(code)
      ? t(`errors.${code}`)
      : t("errors.STREAM_CALL_FAILED");
  }

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    if (!next) resetForm();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (speakingQuota.locked) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("title", title);
        formData.set("cefrLevel", cefrLevel);
        formData.set("topic", topic);
        formData.set("notes", notes);
        await createSpeakingSession(formData);
        await speakingQuota.refreshQuotas();
        void queryClient.invalidateQueries({ queryKey: ["speaking"] });
        router.push("/speaking");
        router.refresh();
        toast.success(t("created"));
        onOpenChange(false);
        resetForm();
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        toast.error(errorMessage(error));
        if (code === "AI_QUOTA_EXCEEDED") {
          await speakingQuota.refreshQuotas();
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={mx(
          styles,
          "workspace-sheet flex max-h-[min(92dvh,calc(100%-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
        )}
        data-sheet-route="speak"
        showCloseButton={!isPending}
      >
        <DialogHeader className={mx(styles, "workspace-sheet-header gap-2 space-y-0 pr-8 text-left")}>
          <p className={mx(styles, "workspace-sheet-kicker")}>{t("title")}</p>
          <DialogTitle className={mx(styles, "workspace-sheet-title")}>
            {t("newTitle")}
          </DialogTitle>
          <DialogDescription className={mx(styles, "workspace-sheet-lede")}>
            {t("newDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className={mx(styles, "workspace-sheet-body")}>
          <p className={mx(styles, "workspace-sheet-hint max-w-none")}>
            {t("modalTip")}
          </p>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label htmlFor="speaking-title" className={mx(styles, "workspace-sheet-label")}>
              {t("titleLabel")}{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Input
              id="speaking-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              className={mx(styles, "workspace-sheet-input")}
              disabled={isPending || speakingQuota.locked}
            />
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <WritingChipPicker
              labelId="speaking-cefr"
              label={tMeta("cefrLabel")}
              value={cefrLevel}
              onChange={setCefrLevel}
              options={WRITING_CEFR_LEVELS.map((level) => ({
                value: level,
                label: tMeta(`cefr.${level as WritingCefr}`),
              }))}
            />
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <WritingChipPicker
              labelId="speaking-topic"
              label={tMeta("topicLabel")}
              value={topic}
              onChange={setTopic}
              options={WRITING_TOPICS.map((item) => ({
                value: item,
                label: resolveTopicLabel(item, (key) => tTags(key)),
              }))}
            />
          </div>

          <div className={mx(styles, "workspace-sheet-field")}>
            <Label htmlFor="speaking-notes" className={mx(styles, "workspace-sheet-label")}>
              {t("notesLabel")}{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">
                ({tc("optional")})
              </span>
            </Label>
            <Textarea
              id="speaking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={2000}
              rows={3}
              disabled={isPending || speakingQuota.locked}
              className={mx(styles, "workspace-sheet-input speaking-notes-field")}
            />
          </div>
        </div>

        <div className={mx(styles, "workspace-sheet-footer")}>
          <Button
            type="button"
            variant="outline"
            className={mx(styles, "workspace-sheet-cancel")}
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {tc("cancel")}
          </Button>
          <QuotaLockButton
            type="button"
            className={mx(styles, "workspace-sheet-cta")}
            locked={speakingQuota.locked}
            lockMessage={speakingQuota.message}
            pending={isPending}
            icon={<Video className="size-4" />}
            onClick={handleSubmit}
          >
            {t("create")}
          </QuotaLockButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
