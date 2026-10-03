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

  return (
    <div
      role="alert"
      className={cn(
        "elevated-surface flex w-full flex-col items-center rounded-md border border-hairline-cloud text-center",
        compact
          ? "gap-3 px-4 py-8 sm:px-6"
          : "mx-auto max-w-lg gap-4 px-5 py-10 sm:px-8 sm:py-12",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-hairline-cloud bg-muted/40">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>

      <div className="space-y-2">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {model.statusCode > 0 ? model.statusCode : t("statusUnavailable")}
        </p>
        <h1 className="font-heading text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
        {model.kind === "rateLimit" && model.retryAfterSeconds ? (
          <p className="text-sm text-muted-foreground">
            {t("rateLimit.retryIn", {
              time: formatRetryAfter(model.retryAfterSeconds),
            })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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
        <p className="pt-2 font-mono text-[0.7rem] text-muted-foreground/80">
          {t("reference", { id: model.referenceId })}
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
