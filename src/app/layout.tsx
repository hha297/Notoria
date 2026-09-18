import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
// Previous Notoria fonts.
// Kept intentionally for rollback/reference.
// Do not delete unless explicitly requested.
//
// Original Notoria font:
// import { Chakra_Petch, VT323 } from "next/font/google";
//
// const chakraPetch = Chakra_Petch({
//   variable: "--font-chakra-petch",
//   subsets: ["latin"],
//   weight: ["300", "400", "500", "600", "700"],
// });
//
// const vt323 = VT323({
//   variable: "--font-vt323",
//   subsets: ["latin"],
//   weight: "400",
// });
//
// Previous OpenCode-inspired heading font (JetBrains Mono was also used as --font-heading):
// Headings now use IBM Plex Sans. JetBrains Mono remains for code only.

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Notoria",
    template: "%s",
  },
  description: "Private language-learning workspace for vocabulary and exercises",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className={`${ibmPlexSans.className} min-h-full font-sans`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthSessionProvider>
              <QueryProvider>
                <TooltipProvider>
                  {children}
                  <Toaster richColors position="top-right" />
                </TooltipProvider>
              </QueryProvider>
            </AuthSessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
