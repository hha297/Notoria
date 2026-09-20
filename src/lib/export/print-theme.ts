export type PrintSurface = "writing" | "theory" | "vocabulary";

/**
 * Print tokens mirrored from light-mode UI (`globals.css`):
 * ink / muted / paper / hairline / module accents.
 */
export const PRINT_INK = "#23251d";
export const PRINT_MUTED = "#6c6e63";
export const PRINT_HAIRLINE = "#bfc1b7";
export const PRINT_PAPER = "#fcfcfa";
export const PRINT_RULE = "#dcdfd2";
export const PRINT_FOOTER = "#6c6e63";
export const PRINT_LEDE_WASH = "#e5e7e0";
export const PRINT_NOTE_WASH = "#e5e7e0";

export const PRINT_ACCENT: Record<PrintSurface, string> = {
  writing: "#c73e66",
  theory: "#5c4aa8",
  vocabulary: "#2c8c66",
};

export const PRINT_RGB = {
  ink: [35, 37, 29],
  muted: [108, 110, 99],
  hairline: [191, 193, 183],
  paper: [252, 252, 250],
  rule: [220, 223, 210],
  footer: [108, 110, 99],
  ledeWash: [229, 231, 224],
  accent: {
    writing: [199, 62, 102],
    theory: [92, 74, 168],
    vocabulary: [44, 140, 102],
  },
} as const;

export function printAccent(surface: PrintSurface) {
  return PRINT_ACCENT[surface];
}

export function hexForDocx(hex: string) {
  return hex.replace("#", "").toUpperCase();
}

/** Family name for DOCX / system font embedding. */
export const DOCX_FONT_SANS = "IBM Plex Sans";
