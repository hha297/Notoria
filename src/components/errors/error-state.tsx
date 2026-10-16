"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileQuestion,
  LogIn,
  MessageSquareWarning,
  RefreshCw,
  WifiOff,
  Clock,
  ShieldOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import errorStyles from "@/components/style/errors/error.module.css";
import { mx } from "@/lib/css-module";
import {
  formatRetryAfter,
  toErrorViewModel,
  type ErrorKind,
  type ErrorResource,
  type ErrorViewModel,
} from "@/lib/errors";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  kind?: ErrorKind;
  error?: unknown;
  resource?: ErrorResource;
  referenceId?: string;
  retryAfterSeconds?: number;
  onReset?: () => void;
  signInCallbackUrl?: string;
  className?: string;
  /** Compact inline card vs page-centered panel. */
  compact?: boolean;
};

function iconFor(kind: ErrorKind) {
  switch (kind) {
    case "unauthorized":
      return LogIn;
    case "forbidden":
      return ShieldOff;
    case "rateLimit":
      return Clock;
    case "offline":
    case "network":
      return WifiOff;
    case "timeout":
      return RefreshCw;
    case "notFound":
    case "resourceNotFound":
      return FileQuestion;
    case "server":
    default:
      return AlertTriangle;
  }
}

function ActionButton({
  action,
  onReset,
  t,
}: {
  action: ErrorViewModel["primaryAction"];
  onReset?: () => void;
  t: ReturnType<typeof useTranslations<"errorPages">>;
}) {
  const router = useRouter();
  const label = t(action.labelKey as Parameters<typeof t>[0]);

  if (action.reset) {
    return (
      <Button
        type="button"
        variant={action.variant ?? "default"}
        onClick={() => onReset?.()}
      >
        <RefreshCw className="size-4" aria-hidden />
        {label}
      </Button>
    );
  }

  if (action.reload) {
    return (
      <Button
        type="button"
        variant={action.variant ?? "default"}
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="size-4" aria-hidden />
        {label}
      </Button>
    );
  }

  if (action.back) {
    return (
      <Button
        type="button"
        variant={action.variant ?? "outline"}
        onClick={() => router.back()}
      >
        {label}
      </Button>
    );
  }

  if (action.href) {
    const isReport = action.labelKey === "actions.report";
    return (
      <LinkButton href={action.href} variant={action.variant ?? "default"}>
        {isReport ? (
          <MessageSquareWarning className="size-4" aria-hidden />
        ) : null}
        {label}
      </LinkButton>
    );
  }

  return null;
}

/**
 * Shared friendly error panel — matches empty-state / elevated-surface language.
 */
export function ErrorState({
  kind,
  error,
  resource,
  referenceId,
  retryAfterSeconds,
  onReset,
  signInCallbackUrl,
  className,
  compact = false,
}: ErrorStateProps) {
  const t = useTranslations("errorPages");
  const model =
    error !== undefined
      ? toErrorViewModel(error, {
          resource,
          referenceId,
          includeReset: Boolean(onReset),
          signInCallbackUrl,
        })
      : toErrorViewModel(
          { status: kindToStatus(kind ?? "server"), code: kind ?? "server" },
          {
            resource,
            referenceId,
            includeReset: Boolean(onReset),
            signInCallbackUrl,
          },
        );

  if (retryAfterSeconds != null) {
    model.retryAfterSeconds = retryAfterSeconds;
  }

  const Icon = iconFor(model.kind);
  const title = t(model.titleKey as Parameters<typeof t>[0]);
  const description = t(model.descriptionKey as Parameters<typeof t>[0]);
  const statusLabel =
    model.statusCode > 0
      ? String(model.statusCode)
      : t("statusUnavailable");

  return (
    <div
      role="alert"
      aria-labelledby="error-state-title"
      aria-describedby="error-state-description"
      data-compact={compact ? "true" : undefined}
      className={cn(mx(errorStyles, "error-panel"), className)}
    >
      <div className={mx(errorStyles, "error-icon-well")} aria-hidden>
        <Icon className="size-6" />
      </div>

      <div className={mx(errorStyles, "error-copy")}>
        <p className={mx(errorStyles, "error-code")}>{statusLabel}</p>
        <h1 id="error-state-title" className={mx(errorStyles, "error-title")}>
          {title}
        </h1>
        <p
          id="error-state-description"
          className={mx(errorStyles, "error-description")}
        >
          {description}
        </p>
        {model.kind === "rateLimit" && model.retryAfterSeconds ? (
          <p className={mx(errorStyles, "error-description")}>
            {t("rateLimit.retryIn", {
              time: formatRetryAfter(model.retryAfterSeconds),
            })}
          </p>
        ) : null}
      </div>

      <div className={mx(errorStyles, "error-actions")}>
        <ActionButton action={model.primaryAction} onReset={onReset} t={t} />
        {model.secondaryAction ? (
          <ActionButton
            action={model.secondaryAction}
            onReset={onReset}
            t={t}
          />
        ) : null}
        {model.tertiaryAction ? (
          <ActionButton
            action={model.tertiaryAction}
            onReset={onReset}
            t={t}
          />
        ) : null}
      </div>

      {model.referenceId ? (
        <p className={mx(errorStyles, "error-reference")}>
          <span className={mx(errorStyles, "error-reference-label")}>
            {t("referenceLabel")}
          </span>
          <span className={mx(errorStyles, "error-reference-id")}>
            {model.referenceId}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function kindToStatus(kind: ErrorKind): number {
  switch (kind) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "notFound":
    case "resourceNotFound":
      return 404;
    case "timeout":
      return 408;
    case "rateLimit":
      return 429;
    case "offline":
    case "network":
      return 0;
    default:
      return 500;
  }
}
