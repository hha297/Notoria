"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { ErrorState } from "@/components/errors/error-state";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import type { AppLocale } from "@/i18n/config";
import type { ErrorKind, ErrorResource } from "@/lib/errors";
import { cn } from "@/lib/utils";

type ErrorPageFrameProps = {
  kind?: ErrorKind;
  error?: unknown;
  resource?: ErrorResource;
  referenceId?: string;
  retryAfterSeconds?: number;
  onReset?: () => void;
  /** Preserve destination for sign-in when kind is unauthorized. */
  withSignInCallback?: boolean;
  className?: string;
};

/**
 * Centers ErrorState in the middle of the viewport.
 * Locale + theme controls sit in the top-end corner (same as auth chrome).
 */
export function ErrorPageFrame({
  kind,
  error,
  resource,
  referenceId,
  retryAfterSeconds,
  onReset,
  withSignInCallback = false,
  className,
}: ErrorPageFrameProps) {
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 grid place-items-center bg-background px-4 py-16",
        className,
      )}
    >
      <div className="absolute end-4 top-4 z-10 sm:end-6 sm:top-6">
        <LocaleThemeControls locale={locale} compact />
      </div>

      <ErrorState
        kind={kind}
        error={error}
        resource={resource}
        referenceId={referenceId}
        retryAfterSeconds={retryAfterSeconds}
        onReset={onReset}
        signInCallbackUrl={withSignInCallback ? pathname : undefined}
      />
    </div>
  );
}
