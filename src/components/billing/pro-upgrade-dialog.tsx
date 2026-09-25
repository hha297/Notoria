"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { ArrowLeft, ArrowLeftRight, CreditCard, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useProAccess } from "@/components/billing/pro-access-provider";
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
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
import { planIntroMonthlyPrice, planMonthlyPrice, type PlanId } from "@/lib/billing/plans";
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

export function ProUpgradeDialog({
  open,
  onOpenChange,
  variant = "upgrade",
  openOnResume = false,
}: ProUpgradeDialogProps) {
  const t = useTranslations("billing");
  const {
    plan,
    cancelAtPeriodEnd,
    currentPeriodEnd,
    scheduledPlan,
    introOfferEligible,
  } = useProAccess();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<PlanId>(plan);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const wasOpen = useRef(false);
  const isLocked = variant === "locked";
  const [, startTransition] = useTransition();
  const showIntro = introOfferEligible && plan === "free";
  const cta = planDialogCta({
    current: plan,
    selected,
    cancelAtPeriodEnd,
    scheduledPlan,
  });
  const periodLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), "d MMM yyyy")
    : t("periodEndFallback");
  const currentPlanLabel = plan === "premium" ? t("premiumBadge") : t("proBadge");
  const pendingChange = Boolean(cancelAtPeriodEnd || scheduledPlan);

  if (open && !wasOpen.current) {
    wasOpen.current = true;
    if (selected !== plan) setSelected(plan);
    const nextConfirm = openOnResume && plan !== "free" && pendingChange ? "keep" : null;
    if (confirm !== nextConfirm) setConfirm(nextConfirm);
  } else if (!open && wasOpen.current) {
    wasOpen.current = false;
    if (confirm) setConfirm(null);
  }

  function handleOpenChange(next: boolean) {
    if (pending && !next) return;
    if (!next) setConfirm(null);
    onOpenChange(next);
  }

  function handleConfirmOpenChange(next: boolean) {
    if (pending && !next) return;
    if (!next) setConfirm(null);
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

  const title =
    plan === "premium"
      ? t("modalTitlePremium")
      : plan === "pro"
        ? t("modalTitlePro")
        : isLocked
          ? t("lockedTitle")
          : t("modalTitle");

  const subtitle =
    plan === "premium"
      ? t("modalSubtitlePremium")
      : plan === "pro"
        ? t("modalSubtitlePro")
        : isLocked
          ? t("lockedDescription")
          : t("modalSubtitle");

  const fineprint = (() => {
    if (selected === plan) {
      if (cancelAtPeriodEnd) {
        return t("accessUntil", { plan: currentPlanLabel, date: periodLabel });
      }
      if (scheduledPlan === "pro") {
        return t("switchingToProOn", { date: periodLabel });
      }
      if (plan === "premium" || plan === "pro") {
        return t("premiumActiveFineprint");
      }
      return t("cancelAnytime");
    }
    if (cta.kind === "none" && cancelAtPeriodEnd && selected === "free") {
      return t("switchScheduled");
    }
    if (cta.kind === "none" && scheduledPlan === selected) {
      return t("downgradeScheduleHint", { date: periodLabel });
    }
    if (cta.kind === "cancel") return t("switchToFreeHint");
    if (cta.kind === "switch") {
      return t("downgradeScheduleHint", { date: periodLabel });
    }
    if (
      (cta.kind === "checkout" || cta.kind === "upgrade") &&
      showIntro &&
      (selected === "pro" || selected === "premium")
    ) {
      return t("introCheckoutHint", {
        intro: planIntroMonthlyPrice(selected),
        price: planMonthlyPrice(selected),
      });
    }
    if (cta.kind === "upgrade" || cta.kind === "checkout") {
      return t("prorationHint");
    }
    return t("cancelAnytime");
  })();

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        className={mx(
          styles,
          "pro-upgrade-sheet flex max-h-[min(92dvh,880px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl sm:p-0",
        )}
      >
        <div className={mx(styles, "pro-upgrade-hero shrink-0")}>
          <DialogHeader className="gap-2 space-y-0 pr-8 text-left">
            <p className={mx(styles, "pro-upgrade-kicker")}>{t("planName")}</p>
            <DialogTitle className={mx(styles, "pro-upgrade-title")}>{title}</DialogTitle>
            <DialogDescription className={mx(styles, "pro-upgrade-lede")}>
              {subtitle}
            </DialogDescription>
            {plan === "pro" || plan === "premium" ? (
              <p className={mx(styles, "pro-upgrade-distinction")}>{t("distinction")}</p>
            ) : null}
            {scheduledPlan === "pro" && plan === "premium" ? (
              <p className={mx(styles, "pro-upgrade-distinction")}>
                {t("switchingToProOn", { date: periodLabel })}
              </p>
            ) : null}
          </DialogHeader>

          <div className={mx(styles, "pro-upgrade-plans")} role="radiogroup">
            <PlanSummary
              name={t("freeBadge")}
              price={planMonthlyPrice("free")}
              description={t("freePlanDescription")}
              selected={selected === "free"}
              current={plan === "free"}
              ends={
                cancelAtPeriodEnd && plan !== "free"
                  ? t("startsOn", { date: periodLabel })
                  : null
              }
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("free");
              }}
            />
            <PlanSummary
              name={t("proBadge")}
              price={showIntro ? planIntroMonthlyPrice("pro") : planMonthlyPrice("pro")}
              wasPrice={showIntro ? planMonthlyPrice("pro") : null}
              period={t("pricePeriod")}
              hint={
                showIntro
                  ? t("introFirstMonthOnly", { price: planMonthlyPrice("pro") })
                  : null
              }
              description={t("proPlanDescription")}
              selected={selected === "pro"}
              current={plan === "pro"}
              ends={
                plan === "pro" && cancelAtPeriodEnd
                  ? t("endsOn", { date: periodLabel })
                  : scheduledPlan === "pro"
                    ? t("startsOn", { date: periodLabel })
                    : null
              }
              popular={plan === "free"}
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("pro");
              }}
            />
            <PlanSummary
              name={t("premiumBadge")}
              price={
                showIntro ? planIntroMonthlyPrice("premium") : planMonthlyPrice("premium")
              }
              wasPrice={showIntro ? planMonthlyPrice("premium") : null}
              period={t("pricePeriod")}
              hint={
                showIntro
                  ? t("introFirstMonthOnly", { price: planMonthlyPrice("premium") })
                  : null
              }
              description={t("premiumPlanDescription")}
              selected={selected === "premium"}
              current={plan === "premium"}
              ends={
                plan === "premium" && cancelAtPeriodEnd
                  ? t("endsOn", { date: periodLabel })
                  : plan === "premium" && scheduledPlan === "pro"
                    ? t("endsOn", { date: periodLabel })
                    : null
              }
              popular={plan === "pro"}
              disabled={pending}
              onSelect={() => {
                setConfirm(null);
                setSelected("premium");
              }}
            />
          </div>
        </div>

        <div className={mx(styles, "pro-upgrade-body min-h-0 flex-1 overflow-y-auto")}>
          <section className={mx(styles, "pro-upgrade-section")}>
            <div className={mx(styles, "pro-upgrade-section-head")}>
              <p className={mx(styles, "pro-upgrade-section-label")}>
                {t("compare.heading")}
              </p>
            </div>
            <PlanComparisonTable currentPlan={plan} />
          </section>
        </div>

        <div className={mx(styles, "pro-upgrade-footer shrink-0")}>
          <div className={mx(styles, "pro-upgrade-actions")}>
            {selected === plan ? (
              <>
                {cta.kind === "keep" ? (
                  <Button
                    type="button"
                    variant="default"
                    className={mx(styles, "pro-upgrade-cta is-primary")}
                    disabled={pending}
                    onClick={requestSelected}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ShieldCheck className="size-4" aria-hidden />
                    )}
                    {t(cta.label)}
                  </Button>
                ) : null}
                {plan === "pro" || plan === "premium" ? (
                  <Button
                    type="button"
                    variant="default"
                    className={mx(styles, "pro-upgrade-cta is-primary")}
                    disabled={pending}
                    onClick={() => {
                      setPending(true);
                      startTransition(async () => {
                        try {
                          const { createPortalSession } = await import(
                            "@/lib/stripe/client-billing"
                          );
                          const result = await createPortalSession();
                          if (!result.ok || !result.url) {
                            toast.error(t(billingErrorKey(result.code)));
                            setPending(false);
                            return;
                          }
                          window.location.assign(result.url);
                        } catch {
                          toast.error(t("portalFailed"));
                          setPending(false);
                        }
                      });
                    }}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <CreditCard className="size-4" aria-hidden />
                    )}
                    {t("manage")}
                  </Button>
                ) : null}
              </>
            ) : cta.kind !== "none" ? (
              <Button
                type="button"
                variant="default"
                className={mx(styles, "pro-upgrade-cta is-primary")}
                disabled={pending}
                onClick={requestSelected}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : cta.kind === "checkout" || cta.kind === "upgrade" ? (
                  <Sparkles className="size-4" aria-hidden />
                ) : (
                  <ArrowLeftRight className="size-4" aria-hidden />
                )}
                {t(cta.label)}
              </Button>
            ) : null}
            <p className={mx(styles, "pro-upgrade-fineprint")}>{fineprint}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <Dialog open={confirm !== null} onOpenChange={handleConfirmOpenChange}>
        <DialogContent
          showCloseButton={!pending}
          className={mx(
            styles,
            "pro-upgrade-confirm-sheet gap-0 overflow-hidden p-0 sm:max-w-md sm:p-0",
          )}
        >
          <div className={mx(styles, "pro-upgrade-confirm")}>
            <DialogHeader className="gap-2 space-y-0 text-left">
              <DialogTitle className={mx(styles, "pro-upgrade-confirm-title")}>
                {confirm === "upgrade"
                  ? t("confirmUpgradeTitle")
                  : confirm === "switch"
                    ? t("confirmDowngradeTitle")
                    : confirm === "cancel"
                      ? t("confirmCancelTitle", { plan: currentPlanLabel })
                      : t("confirmKeepTitle", { plan: currentPlanLabel })}
              </DialogTitle>
              <DialogDescription className={mx(styles, "pro-upgrade-fineprint")}>
                {confirm === "upgrade"
                  ? t("confirmUpgradeBody")
                  : confirm === "switch"
                    ? t("confirmDowngradeBody", { date: periodLabel })
                    : confirm === "cancel"
                      ? t("confirmCancelBody", { plan: currentPlanLabel, date: periodLabel })
                      : t("confirmKeepBody", { plan: currentPlanLabel, date: periodLabel })}
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              variant="default"
              className={mx(styles, "pro-upgrade-cta is-primary")}
              disabled={pending}
              onClick={confirmChange}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : confirm === "upgrade" ? (
                <Sparkles className="size-4" aria-hidden />
              ) : confirm === "keep" ? (
                <ShieldCheck className="size-4" aria-hidden />
              ) : (
                <ArrowLeftRight className="size-4" aria-hidden />
              )}
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
              <ArrowLeft className="size-4" aria-hidden />
              {t("back")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanSummary({
  name,
  price,
  wasPrice = null,
  period,
  hint = null,
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
  wasPrice?: string | null;
  period?: string;
  hint?: string | null;
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
        selected
          ? "pro-upgrade-plan is-featured"
          : popular
            ? "pro-upgrade-plan is-popular"
            : "pro-upgrade-plan",
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
        {wasPrice ? (
          <span className={mx(styles, "pro-upgrade-plan-was")}>{wasPrice}</span>
        ) : null}
        <span className={mx(styles, "pro-upgrade-plan-amount")}>{price}</span>
        {period ? (
          <span className={mx(styles, "pro-upgrade-plan-period")}>{period}</span>
        ) : null}
      </div>
      {hint ? <p className={mx(styles, "pro-upgrade-plan-hint")}>{hint}</p> : null}
      <p className={mx(styles, "pro-upgrade-plan-copy")}>{description}</p>
      {ends ? <p className={mx(styles, "pro-upgrade-plan-copy")}>{ends}</p> : null}
    </button>
  );
}
