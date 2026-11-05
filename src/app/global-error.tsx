"use client";

import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import { bricolageGrotesque, jetbrainsMono } from "@/lib/app-fonts";
import en from "../../messages/en.json";
import "./globals.css";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root-level failure — replaces the root layout, so providers are recreated here.
 * Falls back to English copy when locale messages cannot load.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global-error]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolageGrotesque.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className={`${bricolageGrotesque.className} min-h-full font-sans`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale="en" messages={en}>
          <ThemeProvider>
            <ErrorPageFrame
              kind="server"
              referenceId={error.digest}
              onReset={reset}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
