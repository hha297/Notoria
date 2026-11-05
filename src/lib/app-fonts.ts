import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";

/**
 * App typography — Bricolage Grotesque (body + headings) + JetBrains Mono (code).
 * Bricolage is loaded via next/font/google (variable, self-hosted at build).
 * JetBrains stays local from /public/fonts (same files used for PDF export).
 */

export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-bricolage-grotesque",
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
