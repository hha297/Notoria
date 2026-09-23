"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, Loader2, Sparkles } from "lucide-react";
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
import styles from "@/components/style/billing/pro-upgrade.module.css";
import { mx } from "@/lib/css-module";
import { planMonthlyPrice, type PlanId } from "@/lib/billing/plans";
import { planDialogCta } from "@/lib/stripe/lifecycle";
import {
  billingErrorKey,
  requestPlanChange,
  requestResumePlan,
} from "@/lib/stripe/client-billing";

type ProUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: "upgrade" | "locked";
  openOnResume?: boolean;
};

type ConfirmKind = "upgrade" | "switch" | "cancel" | "keep";

const FREE_POINTS = ["core", "meeting", "transcript", "exercises", "vocabulary"] as const;
const PRO_POINTS = [
  "unlimited",
  "listening",
  "speaking",
  "writing",
  "export",
] as const;
const PREMIUM_POINTS = [
  "coach",
  "profile",
  "daily",
  "weekly",
  "mistakes",
] as const;

export function ProUpgradeDialog({
  open,
  onOpenChange,
  variant = "upgrade",
  openOnResume = false,
}: ProUpgradeDialogProps) {
  const t = useTranslations("billing");
  const { plan, cancelAtPeriodEnd, currentPeriodEnd } = useProAccess();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<PlanId>(plan);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const wasOpen = useRef(false);
  const isLocked = variant === "locked";
  const [, startTransition] = useTransition();
  const cta = planDialogCta({ current: plan, selected, cancelAtPeriodEnd });
  const periodLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), "d MMM yyyy")
    : t("periodEndFallback");
  const currentPlanLabel = plan === "premium" ? t("premiumBadge") : t("proBadge");

  if (open && !wasOpen.current) {
    wasOpen.current = true;
    if (selected !== plan) setSelected(plan);
    const nextConfirm = openOnResume && plan !== "free" ? "keep" : null;
    if (confirm !== nextConfirm) setConfirm(nextConfirm);
  } else if (!open && wasOpen.current) {
    wasOpen.current = false;
    if (confirm) setConfirm(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    onOpenChange(next);
  }

  function submit(target: PlanId | "resume") {
    if (pending) return;
    setPending(true);
    startTransition(async () => {
      try {
        const result =
          target === "resume" ? await requestResumePlan() : await requestPlanChange(target);
        if (!result.ok || !result.url) {
          toast.error(t(billingErrorKey(result.code)));
          setPending(false);
          return;
        }
        window.location.assign(result.url);
      } catch {
        toast.error(t("checkoutFailed"));
        setPending(false);
      }
    });
  }

  function requestSelected() {
    if (cta.kind === "none" || pending) return;
    if (cta.kind === "checkout") {
      submit(selected);
      return;
    }
    setConfirm(cta.kind);
  }

  function confirmChange() {
    if (confirm === "keep") {
      submit("resume");
      return;
    }
    if (confirm === "cancel") {
      submit("free");
      return;
    }
    submit(selected);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        className={mx(
          styles,
          "pro-upgrade-sheet flex max-h-[min(92dvh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl",
        )}
      >
        <div className={mx(styles, "pro-upgrade-hero shrink-0")}>
          <DialogHeader className="gap-2 space-y-0 pr-8 text-left">
            <p className={mx(styles, "pro-upgrade-kicker")}>{t("planName")}</p>
            <DialogTitle className={mx(styles, "pro-upgrade-title")}>
              {isLocked ? t("lockedTitle") : t("modalTitle")}
            </DialogTitle>
            <DialogDescription className={mx(styles, "pro-upgrade-lede")}>
              {isLocked ? t("lockedDescription") : t("modalSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className={mx(styles, "pro-upgrade-plans")} role="radiogroup">
            <PlanSummary
              name={t("freeBadge")}
              price={planMonthlyPrice("free")}
              description={t("freePlanDescription")}
              selected={selected === "free"}
              current={plan === "free"}
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("free");
              }}
            />
            <PlanSummary
              name={t("planName")}
              price={planMonthlyPrice("pro")}
              period={t("pricePeriod")}
              description={t("proPlanDescription")}
              selected={selected === "pro"}
              current={plan === "pro"}
              ends={plan === "pro" && cancelAtPeriodEnd ? t("endsOn", { date: periodLabel }) : null}
              popular={plan === "free"}
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("pro");
              }}
            />
            <PlanSummary
              name={t("premiumBadge")}
              price={planMonthlyPrice("premium")}
              period={t("pricePeriod")}
              description={t("premiumPlanDescription")}
              selected={selected === "premium"}
              current={plan === "premium"}
              ends={
                plan === "premium" && cancelAtPeriodEnd
                  ? t("endsOn", { date: periodLabel })
                  : null
              }
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("premium");
              }}
            />
          </div>
        </div>

        <div className={mx(styles, "pro-upgrade-body min-h-0 flex-1 overflow-y-auto")}>
          {selected === "free" ? (
            <PointList title={t("compare.freeIncludes")} points={FREE_POINTS} />
          ) : null}
          {selected === "pro" ? (
            <PointList title={t("compare.proUnlocks")} points={PRO_POINTS} />
          ) : null}
          {selected === "premium" ? (
            <PointList title={t("compare.premiumAdds")} points={PREMIUM_POINTS} />
          ) : null}
        </div>

        <div className={mx(styles, "pro-upgrade-footer shrink-0")}>
          {confirm ? (
            <div className={mx(styles, "pro-upgrade-confirm")}>
              <p className={mx(styles, "pro-upgrade-confirm-title")}>
                {confirm === "upgrade"
                  ? t("confirmUpgradeTitle")
                  : confirm === "switch"
                    ? t("confirmDowngradeTitle")
                    : confirm === "cancel"
                      ? t("confirmCancelTitle", { plan: currentPlanLabel })
                      : t("confirmKeepTitle", { plan: currentPlanLabel })}
              </p>
              <p className={mx(styles, "pro-upgrade-fineprint")}>
                {confirm === "upgrade"
                  ? t("confirmUpgradeBody")
                  : confirm === "switch"
                    ? t("confirmDowngradeBody")
                    : confirm === "cancel"
                      ? t("confirmCancelBody", { plan: currentPlanLabel, date: periodLabel })
                      : t("confirmKeepBody", { plan: currentPlanLabel, date: periodLabel })}
              </p>
              <Button
                type="button"
                variant={confirm === "cancel" ? "outline" : "default"}
                className={mx(styles, "pro-upgrade-cta")}
                disabled={pending}
                onClick={confirmChange}
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {confirm === "upgrade"
                  ? t("upgradeToPremium")
                  : confirm === "switch"
                    ? t("switchToPro")
                    : confirm === "cancel"
                      ? t("switchToFree")
                      : plan === "premium"
                        ? t("keepPremium")
                        : t("keepPro")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={mx(styles, "pro-upgrade-cancel")}
                disabled={pending}
                onClick={() => setConfirm(null)}
              >
                {t("back")}
              </Button>
            </div>
          ) : (
            <>
              {cta.kind !== "none" ? (
                <Button
                  type="button"
                  variant={cta.kind === "cancel" || cta.kind === "switch" ? "outline" : "default"}
                  className={mx(styles, "pro-upgrade-cta")}
                  disabled={pending}
                  onClick={requestSelected}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {cta.kind === "checkout" || cta.kind === "upgrade" ? (
                    <Sparkles className="size-4" />
                  ) : null}
                  {t(cta.label)}
                </Button>
              ) : null}
              <p className={mx(styles, "pro-upgrade-fineprint")}>
                {cta.kind === "cancel"
                  ? t("switchToFreeHint")
                  : cta.kind === "keep"
                    ? t("accessUntil", { plan: currentPlanLabel, date: periodLabel })
                    : cta.kind === "upgrade" || cta.kind === "switch"
                      ? t("prorationHint")
                      : t("cancelAnytime")}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanSummary({
  name,
  price,
  period,
  description,
  selected = false,
  current = false,
  popular = false,
  ends = null,
  disabled = false,
  onSelect,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  selected?: boolean;
  current?: boolean;
  popular?: boolean;
  ends?: string | null;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("billing");

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={mx(
        styles,
        "pro-upgrade-plan",
        selected && "is-featured",
        current && "is-current",
      )}
    >
      <div className={mx(styles, "pro-upgrade-plan-top")}>
        <p className={mx(styles, "pro-upgrade-plan-name")}>{name}</p>
        {current ? (
          <span className={mx(styles, "pro-upgrade-plan-badge")}>{t("currentPlan")}</span>
        ) : popular ? (
          <span className={mx(styles, "pro-upgrade-plan-badge is-popular")}>
            <Sparkles className="size-3" aria-hidden />
            {t("mostPopular")}
          </span>
        ) : null}
      </div>
      <div className={mx(styles, "pro-upgrade-plan-price")}>
        <span className={mx(styles, "pro-upgrade-plan-amount")}>{price}</span>
        {period ? (
          <span className={mx(styles, "pro-upgrade-plan-period")}>{period}</span>
        ) : null}
      </div>
      <p className={mx(styles, "pro-upgrade-plan-copy")}>{description}</p>
      {ends ? <p className={mx(styles, "pro-upgrade-plan-copy")}>{ends}</p> : null}
    </button>
  );
}

function PointList({
  title,
  points,
}: {
  title: string;
  points: readonly string[];
}) {
  const t = useTranslations("billing.points");

  return (
    <section className={mx(styles, "pro-upgrade-section")}>
      <div className={mx(styles, "pro-upgrade-section-head")}>
        <p className={mx(styles, "pro-upgrade-section-label")}>{title}</p>
      </div>
      <ul className={mx(styles, "pro-upgrade-list")}>
        {points.map((id) => (
          <li key={id} className={mx(styles, "pro-upgrade-row")}>
            <span className={mx(styles, "pro-upgrade-mark is-yes")} aria-hidden>
              <Check className="size-3.5" strokeWidth={2.5} />
            </span>
            <p className={mx(styles, "pro-upgrade-row-label")}>{t(id)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
