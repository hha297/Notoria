import { Font } from "@react-pdf/renderer";

export const PDF_FONT_SANS = "ChakraPetch";

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
          fetchFontBlob(origin, "ChakraPetch-Regular.ttf"),
          fetchFontBlob(origin, "ChakraPetch-Italic.ttf"),
          fetchFontBlob(origin, "ChakraPetch-Medium.ttf"),
          fetchFontBlob(origin, "ChakraPetch-MediumItalic.ttf"),
          fetchFontBlob(origin, "ChakraPetch-Bold.ttf"),
          fetchFontBlob(origin, "ChakraPetch-BoldItalic.ttf"),
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
