"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createStudyInboxItem,
  updateStudyInboxItem,
} from "@/lib/actions/study-inbox";
import type { FolderListItem } from "@/lib/folders/types";

const UNFILED_VALUE = "__unfiled__";

export type InboxCaptureDraft = {
  id: string;
  content: string;
  note: string | null;
  source: string | null;
  folderId: string | null;
};

type InboxCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderListItem[];
  /** Prefill folder when creating from an active folder scope. */
  defaultFolderId?: string | null;
  /** When set, dialog edits this capture instead of creating. */
  editItem?: InboxCaptureDraft | null;
};

type CaptureFormProps = {
  folders: FolderListItem[];
  initialContent: string;
  initialNote: string;
  initialSource: string;
  initialFolderValue: string;
  isEdit: boolean;
  editId?: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    content: string;
    note: string;
    source: string;
    folderId: string | null;
  }) => void;
};

function CaptureForm({
  folders,
  initialContent,
  initialNote,
  initialSource,
  initialFolderValue,
  isEdit,
  isPending,
  onCancel,
  onSubmit,
}: CaptureFormProps) {
  const t = useTranslations("inbox");
  const tc = useTranslations("common");
  const [content, setContent] = useState(initialContent);
  const [note, setNote] = useState(initialNote);
  const [source, setSource] = useState(initialSource);
  const [folderValue, setFolderValue] = useState(initialFolderValue);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error(t("contentRequired"));
      return;
    }
    onSubmit({
      content: trimmed,
      note: note.trim(),
      source: source.trim(),
      folderId: folderValue === UNFILED_VALUE ? null : folderValue,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="inbox-content">{t("contentLabel")}</Label>
        <Textarea
          id="inbox-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("contentPlaceholder")}
          rows={4}
          required
          disabled={isPending}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inbox-note">{t("noteLabel")}</Label>
        <Textarea
          id="inbox-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("notePlaceholder")}
          rows={2}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inbox-source">{t("sourceLabel")}</Label>
        <Input
          id="inbox-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={t("sourcePlaceholder")}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inbox-folder">{t("folderLabel")}</Label>
        <Select
          value={folderValue}
          onValueChange={(value) => {
            if (value) setFolderValue(value);
          }}
          disabled={isPending}
        >
          <SelectTrigger id="inbox-folder" className="w-full">
            <SelectValue>
              {folderValue === UNFILED_VALUE
                ? t("unfiled")
                : (folders.find((folder) => folder.id === folderValue)?.name ??
                  t("unfiled"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNFILED_VALUE}>{t("unfiled")}</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isPending || !content.trim()}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? t("editSubmit") : t("captureSubmit")}
        </Button>
      </div>
    </form>
  );
}

export function InboxCaptureDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId = null,
  editItem = null,
}: InboxCaptureDialogProps) {
  const t = useTranslations("inbox");
  const te = useTranslations("errors");
  const router = useRouter();
  const isEdit = Boolean(editItem);
  const [isPending, startTransition] = useTransition();

  const formKey = editItem
    ? `edit-${editItem.id}`
    : `create-${defaultFolderId ?? "unfiled"}`;

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleSubmit(values: {
    content: string;
    note: string;
    source: string;
    folderId: string | null;
  }) {
    startTransition(async () => {
      try {
        if (isEdit && editItem) {
          await updateStudyInboxItem(editItem.id, values);
          toast.success(t("updated"));
        } else {
          await createStudyInboxItem(values);
          toast.success(t("captured"));
        }
        handleOpenChange(false);
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("captureTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("editDescription") : t("captureDescription")}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CaptureForm
            key={formKey}
            folders={folders}
            initialContent={editItem?.content ?? ""}
            initialNote={editItem?.note ?? ""}
            initialSource={editItem?.source ?? ""}
            initialFolderValue={
              editItem
                ? (editItem.folderId ?? UNFILED_VALUE)
                : (defaultFolderId ?? UNFILED_VALUE)
            }
            isEdit={isEdit}
            isPending={isPending}
            onCancel={() => handleOpenChange(false)}
            onSubmit={handleSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
