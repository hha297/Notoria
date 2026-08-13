"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Dumbbell,
  Languages,
  LayoutDashboard,
  PenLine,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getSuggestedOnboardingActions,
  type OnboardingActionId,
  type WorkspaceActivitySnapshot,
} from "@/lib/onboarding/requirements";
import {
  markOnboardingCompleted,
  markOnboardingSessionPriority,
  shouldShowWorkspaceOnboarding,
} from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";

const EASE = [0.25, 0.1, 0.25, 1] as const;
const SHOW_DELAY_MS = 400;

const FEATURES = [
  { id: "vocabulary", icon: Languages },
  { id: "writing", icon: PenLine },
  { id: "exercises", icon: Dumbbell },
  { id: "theory", icon: BookOpen },
] as const;

const ACTION_ICONS: Record<
  OnboardingActionId,
  typeof Languages
> = {
  "add-vocabulary": Languages,
  "start-writing": PenLine,
  "try-exercise": Dumbbell,
  "explore-theory": BookOpen,
  "explore-workspace": LayoutDashboard,
};

type Step = "welcome" | "actions";

type WorkspaceOnboardingProps = {
  workspaceId: string | null;
  snapshot: WorkspaceActivitySnapshot;
};

export function WorkspaceOnboarding({
  workspaceId,
  snapshot,
}: WorkspaceOnboardingProps) {
  const t = useTranslations("onboarding");
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("welcome");

  const actions = useMemo(
    () => getSuggestedOnboardingActions(snapshot),
    [snapshot],
  );

  useEffect(() => {
    if (!workspaceId || !shouldShowWorkspaceOnboarding(workspaceId)) {
      setVisible(false);
      return;
    }

    markOnboardingSessionPriority();
    setStep("welcome");
    const timeout = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [workspaceId]);

  const dismiss = useCallback(() => {
    if (workspaceId) {
      markOnboardingCompleted(workspaceId);
    }
    setVisible(false);
  }, [workspaceId]);

  useEffect(() => {
    if (!visible) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, dismiss]);

  if (!workspaceId) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          role="dialog"
          aria-labelledby="onboarding-title"
          aria-modal="false"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="pointer-events-auto fixed inset-x-4 bottom-4 z-50 w-auto max-w-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem]"
        >
          <div className="max-h-[min(36rem,calc(100dvh-2rem))] overflow-y-auto rounded-xl border border-hairline-cloud bg-card text-ink shadow-xl shadow-ink/10">
            <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-lime text-ink">
                <Sparkles className="size-5" aria-hidden />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={dismiss}
                aria-label={t("close")}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <AnimatePresence mode="wait">
                {step === "welcome" ? (
                  <motion.div
                    key="welcome"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h2
                        id="onboarding-title"
                        className="font-heading text-xl leading-snug sm:text-2xl"
                      >
                        {t("welcome.title")}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t("welcome.message")}
                      </p>
                    </div>

                    <ul className="grid gap-2">
                      {FEATURES.map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <li
                            key={feature.id}
                            className="flex items-center gap-2.5 text-sm text-ink"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                              <Icon className="size-3.5 text-ink/70" aria-hidden />
                            </span>
                            {t(`welcome.features.${feature.id}`)}
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      <Button type="button" variant="outline" onClick={dismiss}>
                        {t("skip")}
                      </Button>
                      <Button type="button" onClick={() => setStep("actions")}>
                        {t("getStarted")}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h2
                        id="onboarding-title"
                        className="font-heading text-xl leading-snug sm:text-2xl"
                      >
                        {t("firstAction.title")}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t("firstAction.message")}
                      </p>
                    </div>

                    <ul className="grid gap-2">
                      {actions.map((action, index) => {
                        const Icon = ACTION_ICONS[action.id];
                        return (
                          <li key={action.id}>
                            <Link
                              href={action.href}
                              onClick={dismiss}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border border-hairline-cloud p-3 transition-colors hover:bg-muted/60",
                                index === 0 && "border-ink/15 bg-muted/40",
                              )}
                            >
                              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-lime text-ink">
                                <Icon className="size-4" aria-hidden />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-ink">
                                  {t(action.titleKey)}
                                </span>
                                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                  {t(action.descriptionKey)}
                                </span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex justify-end pt-1">
                      <Button type="button" variant="outline" onClick={dismiss}>
                        {t("skipForNow")}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
