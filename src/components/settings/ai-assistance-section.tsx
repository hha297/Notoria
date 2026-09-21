"use client";

import { useTranslations } from "next-intl";
import { useAiPreferences } from "@/components/providers/ai-preferences-provider";
import styles from "@/components/style/settings/settings.module.css";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";
import type {
  AiConfirmActions,
  AiCorrectionStyle,
  AiResponseStyle,
} from "@/lib/ai/preferences";

function SettingsPanel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
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
}: {
  title: string;
  hint: string;
  ariaLabel: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (value: string) => void;
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
              value === optionValue && mx(styles, "is-active"),
            )}
            aria-pressed={value === optionValue}
            onClick={() => onChange(optionValue)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiAssistanceSection() {
  const t = useTranslations("settings.ai");
  const { preferences, updatePreferences } = useAiPreferences();

  return (
    <SettingsPanel
      id="settings-ai"
      title={t("title")}
      description={t("description")}
    >
      <ChoiceRow
        title={t("enabled")}
        hint={t("enabledDescription")}
        ariaLabel={t("enabled")}
        value={preferences.enabled ? "on" : "off"}
        onChange={(value) =>
          void updatePreferences({ enabled: value === "on" })
        }
        options={[
          ["on", t("on")],
          ["off", t("off")],
        ]}
      />

      <ChoiceRow
        title={t("responseStyle")}
        hint={t("responseStyleDescription")}
        ariaLabel={t("responseStyle")}
        value={preferences.responseStyle}
        onChange={(value) =>
          void updatePreferences({
            responseStyle: value as AiResponseStyle,
          })
        }
        options={[
          ["concise", t("responseConcise")],
          ["balanced", t("responseBalanced")],
          ["detailed", t("responseDetailed")],
        ]}
      />

      <ChoiceRow
        title={t("correctionStyle")}
        hint={t("correctionStyleDescription")}
        ariaLabel={t("correctionStyle")}
        value={preferences.correctionStyle}
        onChange={(value) =>
          void updatePreferences({
            correctionStyle: value as AiCorrectionStyle,
          })
        }
        options={[
          ["minimal", t("correctionMinimal")],
          ["explain", t("correctionExplain")],
          ["detailed", t("correctionDetailed")],
        ]}
      />

      <ChoiceRow
        title={t("suggestions")}
        hint={t("suggestionsDescription")}
        ariaLabel={t("suggestions")}
        value={preferences.suggestionsEnabled ? "on" : "off"}
        onChange={(value) =>
          void updatePreferences({ suggestionsEnabled: value === "on" })
        }
        options={[
          ["on", t("on")],
          ["off", t("off")],
        ]}
      />

      <ChoiceRow
        title={t("confirmActions")}
        hint={t("confirmActionsDescription")}
        ariaLabel={t("confirmActions")}
        value={preferences.confirmActions}
        onChange={(value) =>
          void updatePreferences({
            confirmActions: value as AiConfirmActions,
          })
        }
        options={[
          ["always", t("confirmAlways")],
          ["content-change", t("confirmContentChange")],
          ["never", t("confirmNever")],
        ]}
      />
    </SettingsPanel>
  );
}
