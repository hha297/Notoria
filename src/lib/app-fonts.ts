import localFont from "next/font/local";

/**
 * App typography — self-hosted IBM Plex Sans + JetBrains Mono.
 * Loaded via next/font/local so production builds do not fetch Google Fonts
 * (avoids Turbopack's intermittent `@vercel/turbopack-next/internal/font/google/font` failures).
 * Files are the same family already shipped under /public/fonts for PDF export.
 */

export const ibmPlexSans = localFont({
  src: [
    {
      path: "../../public/fonts/IBMPlexSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/IBMPlexSans-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/IBMPlexSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/IBMPlexSans-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    // No SemiBold file in /public/fonts — Medium is the closest match for 600.
    {
      path: "../../public/fonts/IBMPlexSans-Medium.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/IBMPlexSans-MediumItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/IBMPlexSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/IBMPlexSans-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: [
    {
      path: "../../public/fonts/JetBrainsMono-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/JetBrainsMono-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/JetBrainsMono-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
