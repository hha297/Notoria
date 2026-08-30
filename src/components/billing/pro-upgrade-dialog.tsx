"use client";

import { useTransition } from "react";
import { Check, Loader2, Lock, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { Badge } from "@/components/ui/badge";
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

function CompareValue({ included }: { included: boolean }) {
  const t = useTranslations("billing.compare");

  if (included) {
    return (
      <span
        className="inline-flex items-center justify-center text-ink"
        aria-label={t("yes")}
      >
        <Check className="size-4 shrink-0 text-accent-lime" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center text-muted-foreground"
      aria-label={t("locked")}
    >
      <Lock className="size-4 shrink-0" aria-hidden />
    </span>
  );
}

function PlanSummary({
  plan,
  highlighted = false,
  isCurrentPlan = false,
}: {
  plan: "free" | "pro";
  highlighted?: boolean;
  isCurrentPlan?: boolean;
}) {
  const t = useTranslations("billing");
  const isPro = plan === "pro";
  const hasTopBadge = isCurrentPlan || (highlighted && !isCurrentPlan);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border px-4 py-4",
        highlighted
          ? "border-accent-lime/50 bg-accent-lime/5 shadow-[0_0_0_1px_rgba(198,227,91,0.15)]"
          : "border-hairline-cloud bg-card",
        isCurrentPlan && !highlighted && "ring-1 ring-foreground/10",
      )}
    >
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
        {isCurrentPlan ? (
          <Badge variant="outline" className="text-[11px] text-ink">
            {t("currentPlan")}
          </Badge>
        ) : null}
        {highlighted && !isCurrentPlan ? (
          <Badge
            variant="secondary"
            className="gap-1 bg-accent-lime/20 text-[11px] text-ink"
          >
            <Star className="size-3 fill-accent-lime text-accent-lime" />
            {t("mostPopular")}
          </Badge>
        ) : null}
      </div>

      <div className={cn("space-y-1", hasTopBadge && "pr-24")}>
        <p className="text-sm font-semibold text-ink">
          {isPro ? t("planName") : t("freeBadge")}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="font-heading text-3xl font-semibold tracking-tight text-ink">
            {isPro ? t("priceAmount") : t("freePrice")}
          </p>
          {isPro ? (
            <p className="text-xs text-muted-foreground">{t("pricePeriod")}</p>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isPro ? t("proPlanDescription") : t("freePlanDescription")}
        </p>
      </div>
    </div>
  );
}

export function ProUpgradeDialog({
  open,
  onOpenChange,
  variant = "upgrade",
}: ProUpgradeDialogProps) {
  const t = useTranslations("billing");
  const tc = useTranslations("common");
  const tCompare = useTranslations("billing.compare");
  const { hasProAccess } = useProAccess();
  const [isPending, startTransition] = useTransition();
  const isLocked = variant === "locked";

  function handleOpenChange(next: boolean) {
    if (isPending && !next) return;
    onOpenChange(next);
  }

  function handleUpgrade() {
    if (isPending || hasProAccess) return;

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
        className="flex max-h-[min(92dvh,840px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-hairline-cloud px-5 py-4 pr-12">
          <DialogTitle className="text-lg font-semibold text-ink sm:text-xl">
            {isLocked ? t("lockedTitle") : t("modalTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {isLocked ? t("lockedDescription") : t("modalSubtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid shrink-0 grid-cols-1 gap-3 px-5 pt-4 sm:grid-cols-2 sm:gap-4">
          <PlanSummary plan="free" isCurrentPlan={!hasProAccess} />
          <PlanSummary plan="pro" highlighted isCurrentPlan={hasProAccess} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="overflow-hidden rounded-xl border border-hairline-cloud">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-auto" />
                <col className="w-12 sm:w-14" />
                <col className="w-12 sm:w-14" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b border-hairline-cloud">
                  <th className="px-3 py-2 text-xs font-semibold text-ink">
                    {tCompare("capability")}
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-ink">
                    {tCompare("free")}
                  </th>
                  <th className="bg-accent-lime/10 px-2 py-2 text-center text-xs font-semibold text-ink">
                    {tCompare("pro")}
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
                    <td className="px-3 py-2 leading-snug break-words text-ink">
                      {t(`compare.rows.${row.id}.capability`)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <CompareValue included={row.free === "yes"} />
                    </td>
                    <td className="bg-accent-lime/5 px-2 py-2 text-center">
                      <CompareValue included />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-3 border-t border-hairline-cloud px-5 py-4 sm:grid-cols-2 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={isPending || hasProAccess}
            onClick={handleUpgrade}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {hasProAccess ? t("currentPlan") : t("choosePro")}
          </Button>
        </div>

        <p className="shrink-0 px-5 pb-4 text-center text-xs text-muted-foreground">
          {t("cancelAnytime")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
