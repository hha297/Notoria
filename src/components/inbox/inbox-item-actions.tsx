"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  Dumbbell,
  Languages,
  MoreHorizontal,
  PenLine,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import styles from "@/components/style/inbox/inbox.module.css";
import { mx } from "@/lib/css-module";
import { processStudyInboxItem } from "@/lib/actions/study-inbox";
import type { StudyInboxProcessTarget } from "@/schemas/study-inbox";

type InboxItemActionsProps = {
  id: string;
  status: "unprocessed" | "processed";
};

const PROCESS_TARGETS: Array<{
  target: Exclude<StudyInboxProcessTarget, "keep" | "delete">;
  icon: typeof Languages;
}> = [
  { target: "vocabulary", icon: Languages },
  { target: "theory", icon: BookOpen },
  { target: "writing", icon: PenLine },
  { target: "exercise", icon: Dumbbell },
];

export function InboxItemActions({ id, status }: InboxItemActionsProps) {
  const t = useTranslations("inbox");
  const te = useTranslations("errors");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(target: StudyInboxProcessTarget) {
    startTransition(async () => {
      try {
        const result = await processStudyInboxItem({ id, target });
        if (target === "delete") {
          toast.success(t("deleted"));
          router.refresh();
          return;
        }
        if (result.redirectTo) {
          router.push(result.redirectTo);
          return;
        }
        router.refresh();
      } catch {
        toast.error(te("generic"));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={t("processMenu")}
        className={mx(styles, "inbox-process-trigger")}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={mx(styles, "inbox-process-menu")}
      >
        {status === "unprocessed"
          ? PROCESS_TARGETS.map(({ target, icon: Icon }) => (
              <DropdownMenuItem
                key={target}
                disabled={isPending}
                data-target={target}
                className={mx(styles, "inbox-process-option")}
                onClick={() => run(target)}
              >
                <Icon className="size-4 shrink-0" />
                {t(`process.${target}`)}
              </DropdownMenuItem>
            ))
          : null}
        {status === "unprocessed" ? (
          <DropdownMenuItem
            disabled={isPending}
            data-target="keep"
            className={mx(styles, "inbox-process-option")}
            onClick={() => run("keep")}
          >
            <Bookmark className="size-4 shrink-0" />
            {t("process.keep")}
          </DropdownMenuItem>
        ) : null}
        {status === "unprocessed" ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          disabled={isPending}
          variant="destructive"
          className={mx(styles, "inbox-process-delete")}
          onClick={() => run("delete")}
        >
          <Trash2 className="size-4 shrink-0" />
          {t("process.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
