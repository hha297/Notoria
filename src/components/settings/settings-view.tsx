"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAppPreferences } from "@/components/providers/preferences-provider";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearSectionTutorials,
  hasCompletedSectionTutorials,
} from "@/lib/onboarding/storage";
import { clearAppLocalPreferences } from "@/lib/preferences/app-preferences";
import type { ReduceMotionPreference } from "@/lib/preferences/app-preferences";
import { KeyboardShortcutsSection } from "@/components/settings/keyboard-shortcuts-section";
import { AiAssistanceSection } from "@/components/settings/ai-assistance-section";
import { TagManagerSettingsSection } from "@/components/settings/tag-manager-settings-section";
import styles from "@/components/style/settings/settings.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export function SettingsView({
  workspaceId = null,
}: {
  workspaceId?: string | null;
}) {
  const t = useTranslations("settings");

  return (
    <PageShell className="writing-atelier-shell settings-atelier-shell">
      <div
        className={cn(
          "settings-atelier",
          mx(
            styles,
            "writing-atelier settings-atelier flex flex-col gap-10 lg:gap-12",
          ),
        )}
      >
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">
              {t("title")}{" "}
              <span className="text-module-settings-fg">{t("highlight")}</span>
            </h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
        </header>

        <div className={mx(styles, "settings-stack")}>
          <AppearanceSection />
          <AccessibilitySection />
          <AiAssistanceSection />
          <TagManagerSettingsSection workspaceId={workspaceId} />
          <LearningSection />
          <KeyboardShortcutsSection />
          <DataPrivacySection />
        </div>
      </div>
    </PageShell>
  );
}

function SettingsPanel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={mx(styles, "settings-panel")} aria-labelledby={id}>
      <header className={mx(styles, "settings-panel-head")}>
        <h2 id={id} className={mx(styles, "settings-panel-title")}>
          {title}
        </h2>
        <p className={mx(styles, "settings-panel-lede")}>{description}</p>
      </header>
      <div className={mx(styles, "settings-panel-body settings-prefs")}>{children}</div>
    </section>
  );
}

function ChoiceRow({
  title,
  hint,
  ariaLabel,
  options,
  value,
  onChange,
  ready = true,
}: {
  title: string;
  hint: string;
  ariaLabel: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
  ready?: boolean;
}) {
  return (
    <div className={mx(styles, "settings-row")}>
      <div className={mx(styles, "settings-row-copy")}>
        <p className={mx(styles, "settings-row-title")}>{title}</p>
        <p className={mx(styles, "settings-row-hint")}>{hint}</p>
      </div>
      <div className={mx(styles, "settings-choice-row")} role="group" aria-label={ariaLabel}>
        {options.map(([optionValue, label]) => (
          <button
            key={optionValue}
            type="button"
            className={cn(
              mx(styles, "settings-choice-chip"),
              ready && value === optionValue && mx(styles, "is-active"),
            )}
            aria-pressed={ready && value === optionValue}
            disabled={!ready}
            onClick={() => onChange(optionValue)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AppearanceSection() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? (theme ?? "system") : "system";

  return (
    <SettingsPanel
      id="settings-appearance"
      title={t("appearance")}
      description={t("appearanceDescription")}
    >
      <ChoiceRow
        title={t("theme")}
        hint={t("themeDescription")}
        ariaLabel={t("theme")}
        value={active}
        ready={mounted}
        onChange={setTheme}
        options={[
          ["light", t("themeLight")],
          ["dark", t("themeDark")],
          ["system", t("themeSystem")],
        ]}
      />
    </SettingsPanel>
  );
}

function AccessibilitySection() {
  const t = useTranslations("settings");
  const { reduceMotion, setReduceMotion, ready } = useAppPreferences();

  return (
    <SettingsPanel
      id="settings-accessibility"
      title={t("accessibility")}
      description={t("accessibilityDescription")}
    >
      <ChoiceRow
        title={t("motion")}
        hint={t("motionDescription")}
        ariaLabel={t("motion")}
        value={reduceMotion}
        ready={ready}
        onChange={(value) =>
          setReduceMotion(value as ReduceMotionPreference)
        }
        options={[
          ["system", t("motionSystem")],
          ["reduce", t("motionReduce")],
          ["full", t("motionFull")],
        ]}
      />
    </SettingsPanel>
  );
}

function LearningSection() {
  const t = useTranslations("settings");
  const [hasTutorials, setHasTutorials] = useState(false);

  useEffect(() => {
    setHasTutorials(hasCompletedSectionTutorials());
  }, []);

  function handleResetTutorials() {
    clearSectionTutorials();
    setHasTutorials(false);
    toast.success(t("tutorialsResetDone"));
  }

  return (
    <SettingsPanel
      id="settings-learning"
      title={t("learning")}
      description={t("learningDescription")}
    >
      <div className={mx(styles, "settings-row settings-row-action")}>
        <div className={mx(styles, "settings-row-copy")}>
          <p className={mx(styles, "settings-row-title")}>{t("tutorials")}</p>
          <p className={mx(styles, "settings-row-hint")}>{t("tutorialsDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="route-quiet-action shrink-0"
          data-route-action="settings"
          disabled={!hasTutorials}
          onClick={handleResetTutorials}
        >
          <RotateCcw className="size-4" />
          {t("tutorialsReset")}
        </Button>
      </div>
    </SettingsPanel>
  );
}

function DataPrivacySection() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { setReduceMotion } = useAppPreferences();

  function handleClear() {
    clearAppLocalPreferences();
    setReduceMotion("system");
    setConfirmOpen(false);
    toast.success(t("data.clearDone"));
  }

  return (
    <SettingsPanel
      id="settings-data"
      title={t("data.title")}
      description={t("data.description")}
    >
      <div className={mx(styles, "settings-row settings-row-action")}>
        <div className={mx(styles, "settings-row-copy")}>
          <p className={mx(styles, "settings-row-title")}>{t("data.clear")}</p>
          <p className={mx(styles, "settings-row-hint")}>{t("data.clearDescription")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="route-quiet-action shrink-0"
          data-route-action="settings"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          {t("data.clear")}
        </Button>
      </div>

      <div className={mx(styles, "settings-row")}>
        <div className={mx(styles, "settings-row-copy")}>
          <p className={mx(styles, "settings-row-title")}>{t("data.policiesTitle")}</p>
          <p className={mx(styles, "settings-row-hint")}>
            {t("data.policiesDescription")}{" "}
            <Link href="/privacy" className={mx(styles, "settings-inline-link")}>
              {t("data.privacyLink")}
            </Link>
            {" · "}
            <Link href="/terms" className={mx(styles, "settings-inline-link")}>
              {t("data.termsLink")}
            </Link>
            {" · "}
            <Link href="/help" className={mx(styles, "settings-inline-link")}>
              {t("data.helpLink")}
            </Link>
          </p>
          <p className={mx(styles, "settings-row-hint")}>
            <a href="mailto:contact@notoria.fi">contact@notoria.fi</a>
          </p>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("data.clearConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("data.clearConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleClear}>
              {t("data.clear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsPanel>
  );
}
