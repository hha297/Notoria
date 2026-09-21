import { Font } from "@react-pdf/renderer";

/** Matches the app body font (`IBM_Plex_Sans` in `layout.tsx`). */
export const PDF_FONT_SANS = "IBMPlexSans";

let fontReady: Promise<void> | null = null;

async function fetchFontBlob(origin: string, filename: string) {
  const response = await fetch(`${origin}/fonts/${filename}`);
  if (!response.ok) {
    throw new Error(`Font load failed: ${filename} (${response.status})`);
  }
  return response.blob();
}

export async function ensurePdfFonts() {
  if (typeof window === "undefined") return;
  if (!fontReady) {
    fontReady = (async () => {
      const origin = window.location.origin;
      const [regular, italic, medium, mediumItalic, bold, boldItalic] =
        await Promise.all([
          fetchFontBlob(origin, "IBMPlexSans-Regular.ttf"),
          fetchFontBlob(origin, "IBMPlexSans-Italic.ttf"),
          fetchFontBlob(origin, "IBMPlexSans-Medium.ttf"),
          fetchFontBlob(origin, "IBMPlexSans-MediumItalic.ttf"),
          fetchFontBlob(origin, "IBMPlexSans-Bold.ttf"),
          fetchFontBlob(origin, "IBMPlexSans-BoldItalic.ttf"),
        ]);

      Font.register({
        family: PDF_FONT_SANS,
        fonts: [
          { src: URL.createObjectURL(regular), fontWeight: 400 },
          {
            src: URL.createObjectURL(italic),
            fontWeight: 400,
            fontStyle: "italic",
          },
          { src: URL.createObjectURL(medium), fontWeight: 500 },
          {
            src: URL.createObjectURL(mediumItalic),
            fontWeight: 500,
            fontStyle: "italic",
          },
          { src: URL.createObjectURL(bold), fontWeight: 700 },
          {
            src: URL.createObjectURL(boldItalic),
            fontWeight: 700,
            fontStyle: "italic",
          },
        ],
      });

      // Never soft-hyphenate mid-word (e.g. "ongel-man") — wrap whole words only.
      Font.registerHyphenationCallback((word) => [word]);
    })().catch((error) => {
      fontReady = null;
      throw error;
    });
  }

  await fontReady;
}
