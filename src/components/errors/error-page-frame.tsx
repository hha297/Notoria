"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { ErrorState } from "@/components/errors/error-state";
import { LocaleThemeControls } from "@/components/layout/locale-theme-controls";
import errorStyles from "@/components/style/errors/error.module.css";
import { mx } from "@/lib/css-module";
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
 * Full-viewport error takeover. Portaled to document.body so studio sidebar /
 * navbar stacking contexts (isolation) cannot keep chrome visible underneath.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const frame = (
    <div
      className={cn(mx(errorStyles, "error-frame"), className)}
      data-error-page-frame=""
    >
      <div className={mx(errorStyles, "error-frame-chrome")}>
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

  if (!mounted || typeof document === "undefined") {
    return frame;
  }

  return createPortal(frame, document.body);
}
