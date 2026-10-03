"use client";

import { useEffect } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorPageFrame } from "@/components/errors/error-page-frame";
import en from "../../messages/en.json";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

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
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSans.variable} h-full antialiased`}>
      <body className={`${ibmPlexSans.className} min-h-full font-sans`} suppressHydrationWarning>
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
