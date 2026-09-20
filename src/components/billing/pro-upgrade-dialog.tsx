"use client";

import { useTransition } from "react";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
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
  { id: "practice", free: "yes" },
  { id: "vocabAi", free: "yes" },
  { id: "studio", free: "yes" },
  { id: "csv", free: "yes" },
  { id: "aiPractice", free: "locked" },
  { id: "writingAi", free: "locked" },
  { id: "export", free: "locked" },
  { id: "listening", free: "locked" },
  { id: "speaking", free: "locked" },
] as const;

type CompareRowId = (typeof COMPARE_ROWS)[number]["id"];

const FREE_ROWS = COMPARE_ROWS.filter((row) => row.free === "yes");
const PRO_ROWS = COMPARE_ROWS.filter((row) => row.free === "locked");

function compareRowCapability(
  t: (key: `compare.rows.${CompareRowId}.capability`) => string,
  id: CompareRowId,
) {
  return t(`compare.rows.${id}.capability`);
}

type ProUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "upgrade" | "locked";
};

function StatusMark({ included }: { included: boolean }) {
  const t = useTranslations("billing.compare");

  if (included) {
    return (
      <span className="pro-upgrade-mark is-yes" aria-label={t("yes")}>
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return (
    <span className="pro-upgrade-mark is-locked" aria-label={t("locked")}>
      <Lock className="size-3.5" aria-hidden />
    </span>
  );
}

function PlanCard({
  plan,
  featured = false,
  isCurrent = false,
}: {
  plan: "free" | "pro";
  featured?: boolean;
  isCurrent?: boolean;
}) {
  const t = useTranslations("billing");
  const isPro = plan === "pro";

  return (
    <article
      className={cn(
        "pro-upgrade-plan",
        featured && "is-featured",
        isCurrent && "is-current",
      )}
    >
      <div className="pro-upgrade-plan-top">
        <p className="pro-upgrade-plan-name">
          {isPro ? t("planName") : t("freeBadge")}
        </p>
        {isCurrent ? (
          <span className="pro-upgrade-plan-badge">{t("currentPlan")}</span>
        ) : featured ? (
          <span className="pro-upgrade-plan-badge is-popular">
            <Sparkles className="size-3" aria-hidden />
            {t("mostPopular")}
          </span>
        ) : null}
      </div>

      <div className="pro-upgrade-plan-price">
        <span className="pro-upgrade-plan-amount">
          {isPro ? t("priceAmount") : t("freePrice")}
        </span>
        {isPro ? (
          <span className="pro-upgrade-plan-period">{t("pricePeriod")}</span>
        ) : null}
      </div>

      <p className="pro-upgrade-plan-copy">
        {isPro ? t("proPlanDescription") : t("freePlanDescription")}
      </p>
    </article>
  );
}

function CompareSection({
  label,
  rows,
  capability,
}: {
  label: string;
  rows: readonly (typeof COMPARE_ROWS)[number][];
  capability: (id: CompareRowId) => string;
}) {
  const tCompare = useTranslations("billing.compare");

  return (
    <section className="pro-upgrade-section">
      <div className="pro-upgrade-section-head">
        <p className="pro-upgrade-section-label">{label}</p>
        <div className="pro-upgrade-col-labels" aria-hidden>
          <span>{tCompare("free")}</span>
          <span>{tCompare("pro")}</span>
        </div>
      </div>
      <ul className="pro-upgrade-list">
        {rows.map((row) => (
          <li key={row.id} className="pro-upgrade-row">
            <p className="pro-upgrade-row-label">{capability(row.id)}</p>
            <div className="pro-upgrade-row-marks">
              <StatusMark included={row.free === "yes"} />
              <StatusMark included />
            </div>
          </li>
        ))}
      </ul>
    </section>
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
        className="pro-upgrade-sheet flex max-h-[min(92dvh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="pro-upgrade-hero shrink-0">
          <DialogHeader className="gap-2 space-y-0 pr-8 text-left">
            <p className="pro-upgrade-kicker">{t("planName")}</p>
            <DialogTitle className="pro-upgrade-title">
              {isLocked ? t("lockedTitle") : t("modalTitle")}
            </DialogTitle>
            <DialogDescription className="pro-upgrade-lede">
              {isLocked ? t("lockedDescription") : t("modalSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="pro-upgrade-plans">
            <PlanCard plan="free" isCurrent={!hasProAccess} />
            <PlanCard plan="pro" featured isCurrent={hasProAccess} />
          </div>
        </div>

        <div className="pro-upgrade-body min-h-0 flex-1 overflow-y-auto">
          <CompareSection
            label={tCompare("freeIncludes")}
            rows={FREE_ROWS}
            capability={(id) => compareRowCapability(t, id)}
          />
          <CompareSection
            label={tCompare("proUnlocks")}
            rows={PRO_ROWS}
            capability={(id) => compareRowCapability(t, id)}
          />
        </div>

        <div className="pro-upgrade-footer shrink-0">
          <div className="pro-upgrade-actions">
            <Button
              type="button"
              variant="outline"
              className="pro-upgrade-cancel"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              size="lg"
              className="pro-upgrade-cta"
              disabled={isPending || hasProAccess}
              onClick={handleUpgrade}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {hasProAccess ? t("currentPlan") : t("choosePro")}
            </Button>
          </div>
          <p className="pro-upgrade-fineprint">{t("cancelAnytime")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
