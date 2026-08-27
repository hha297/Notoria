"use client";

import { useTransition } from "react";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
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
import {
  billingErrorKey,
  createCheckoutSession,
} from "@/lib/stripe/client-billing";
import { cn } from "@/lib/utils";

const COMPARE_ROWS = [
  { id: "vocab", free: "yes" },
  { id: "vocabAi", free: "yes" },
  { id: "csv", free: "yes" },
  { id: "export", free: "locked" },
  { id: "writing", free: "yes" },
  { id: "writingAi", free: "locked" },
  { id: "exercises", free: "yes" },
  { id: "fillBlank", free: "locked" },
  { id: "theory", free: "yes" },
  { id: "theoryAi", free: "locked" },
  { id: "importAi", free: "locked" },
  { id: "listening", free: "locked" },
  { id: "speaking", free: "locked" },
] as const;

type ProUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "upgrade" | "locked";
};

function PlanCell({ included }: { included: boolean }) {
  const t = useTranslations("billing.compare");

  if (included) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-ink">
        <Check className="size-3.5 text-accent-lime" />
        {t("yes")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground">
      <Lock className="size-3.5" />
      {t("locked")}
    </span>
  );
}

export function ProUpgradeDialog({
  open,
  onOpenChange,
  variant = "upgrade",
}: ProUpgradeDialogProps) {
  const t = useTranslations("billing");
  const [isPending, startTransition] = useTransition();
  const isLocked = variant === "locked";

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleUpgrade() {
    if (isPending) return;

    startTransition(async () => {
      try {
        const result = await createCheckoutSession();
        if (!result.ok || !result.url) {
          toast.error(t(billingErrorKey(result.code)));
          return;
        }
        window.location.assign(result.url);
      } catch {
        toast.error(t("checkoutFailed"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!isPending}
        className="gap-3 overflow-hidden p-4 sm:max-w-3xl sm:p-5"
      >
        <DialogHeader className="gap-1 pr-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-accent-lime/20 text-accent-lime">
                <Sparkles className="size-3.5" />
              </div>
              <DialogTitle className="text-base text-ink sm:text-lg">
                {isLocked ? t("lockedTitle") : t("modalTitle")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm leading-snug">
              {isLocked ? t("lockedDescription") : t("modalSubtitle")}
            </DialogDescription>
          </div>
          <p className="shrink-0 font-heading text-xl font-medium text-ink">
            {t("price")}
          </p>
        </DialogHeader>

        <div className="rounded-xl border border-hairline-cloud">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="hidden w-[34%] sm:table-column" />
            </colgroup>
            <thead>
              <tr className="border-b border-hairline-cloud bg-muted/40">
                <th className="px-2.5 py-1.5 text-xs font-semibold text-ink sm:px-3">
                  {t("compare.capability")}
                </th>
                <th className="px-2.5 py-1.5 text-xs font-semibold text-ink sm:px-3">
                  {t("compare.free")}
                </th>
                <th className="bg-accent-lime/10 px-2.5 py-1.5 text-xs font-semibold text-ink sm:px-3">
                  {t("compare.pro")}
                </th>
                <th className="hidden px-2.5 py-1.5 text-xs font-semibold text-ink sm:table-cell sm:px-3">
                  {t("compare.impact")}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-hairline-cloud last:border-b-0",
                    index % 2 === 1 && "bg-muted/20",
                  )}
                >
                  <td className="px-2.5 py-1.5 leading-snug text-ink sm:px-3">
                    {t(`compare.rows.${row.id}.capability`)}
                  </td>
                  <td className="px-2.5 py-1.5 sm:px-3">
                    <PlanCell included={row.free === "yes"} />
                  </td>
                  <td className="bg-accent-lime/10 px-2.5 py-1.5 sm:px-3">
                    <PlanCell included />
                  </td>
                  <td className="hidden px-2.5 py-1.5 leading-snug text-muted-foreground sm:table-cell sm:px-3">
                    {t(`compare.rows.${row.id}.impact`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1">
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={handleUpgrade}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("upgrade")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("cancelAnytime")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
