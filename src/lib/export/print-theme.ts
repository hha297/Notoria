export type PrintSurface = "writing" | "theory" | "vocabulary";

/** Fixed in the exported file; change requires exporting again. */
export type ExportAppearance = "print" | "theme";

export type ExportColorMode = "light" | "dark";

export type ExportThemeTokens = {
  appearance: ExportAppearance;
  mode: ExportColorMode;
  ink: string;
  muted: string;
  hairline: string;
  paper: string;
  rule: string;
  footer: string;
  wash: string;
  accent: string;
  accentSoft: string;
  highlight: string;
  link: string;
  onAccent: string;
};

export type ExportThemeRgb = {
  ink: [number, number, number];
  muted: [number, number, number];
  hairline: [number, number, number];
  paper: [number, number, number];
  rule: [number, number, number];
  footer: [number, number, number];
  wash: [number, number, number];
  accent: [number, number, number];
  accentSoft: [number, number, number];
};

/**
 * Print-friendly tokens (white page, dark text, restrained accents).
 * Mirrored from light-mode UI neutrals with a pure white paper for print.
 */
export const PRINT_INK = "#23251d";
export const PRINT_MUTED = "#6c6e63";
export const PRINT_HAIRLINE = "#bfc1b7";
export const PRINT_PAPER = "#ffffff";
export const PRINT_RULE = "#dcdfd2";
export const PRINT_FOOTER = "#6c6e63";
export const PRINT_LEDE_WASH = "#e5e7e0";
export const PRINT_NOTE_WASH = "#e5e7e0";
export const PRINT_HIGHLIGHT = "#f2f6c8";
export const PRINT_LINK = "#1078a3";
export const PRINT_ON_ACCENT = "#ffffff";

export const PRINT_ACCENT: Record<PrintSurface, string> = {
  writing: "#c73e66",
  theory: "#5c4aa8",
  vocabulary: "#2c8c66",
};

export const PRINT_ACCENT_SOFT: Record<PrintSurface, string> = {
  writing: "#fce8ef",
  theory: "#ebe6f8",
  vocabulary: "#e3f2e9",
};

/** @deprecated Prefer resolveExportTheme().rgb — kept for gradual call-site migration. */
export const PRINT_RGB = {
  ink: [35, 37, 29] as [number, number, number],
  muted: [108, 110, 99] as [number, number, number],
  hairline: [191, 193, 183] as [number, number, number],
  paper: [255, 255, 255] as [number, number, number],
  rule: [220, 223, 210] as [number, number, number],
  footer: [108, 110, 99] as [number, number, number],
  ledeWash: [229, 231, 224] as [number, number, number],
  accent: {
    writing: [199, 62, 102] as [number, number, number],
    theory: [92, 74, 168] as [number, number, number],
    vocabulary: [44, 140, 102] as [number, number, number],
  },
} as const;

export const DEFAULT_EXPORT_APPEARANCE: ExportAppearance = "print";

/** Family name for DOCX / system font embedding. */
export const DOCX_FONT_SANS = "IBM Plex Sans";
export const DOCX_FONT_MONO = "JetBrains Mono";
/** Fallbacks when IBM Plex / JetBrains are not installed on the reader. */
export const DOCX_FONT_SANS_FALLBACK = "Calibri";
export const DOCX_FONT_MONO_FALLBACK = "Consolas";

const SURFACE_CSS: Record<
  PrintSurface,
  { accent: string; accentSoft: string }
> = {
  writing: {
    accent: "--module-writing-fg",
    accentSoft: "--module-writing-bg",
  },
  theory: {
    accent: "--module-theory-fg",
    accentSoft: "--module-theory-bg",
  },
  vocabulary: {
    accent: "--module-vocab-fg",
    accentSoft: "--module-vocab-bg",
  },
};

export function printAccent(surface: PrintSurface) {
  return PRINT_ACCENT[surface];
}

export function hexForDocx(hex: string) {
  return hex.replace("#", "").toUpperCase();
}

export function parseCssColorToHex(raw: string, fallback: string): string {
  const value = raw.trim();
  if (!value) return fallback;
  if (value.startsWith("#")) {
    if (value.length === 4) {
      const r = value[1];
      const g = value[2];
      const b = value[3];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    if (value.length >= 7) return value.slice(0, 7).toLowerCase();
  }
  const rgbMatch = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (rgbMatch) {
    const r = Math.round(Number(rgbMatch[1]));
    const g = Math.round(Number(rgbMatch[2]));
    const b = Math.round(Number(rgbMatch[3]));
    return rgbToHex(r, g, b);
  }
  return fallback;
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function readCssVar(name: string, fallback: string): string {
  if (typeof window === "undefined" || typeof getComputedStyle === "undefined") {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return parseCssColorToHex(raw, fallback);
}

function printFriendlyTokens(surface: PrintSurface): ExportThemeTokens {
  return {
    appearance: "print",
    mode: "light",
    ink: PRINT_INK,
    muted: PRINT_MUTED,
    hairline: PRINT_HAIRLINE,
    paper: PRINT_PAPER,
    rule: PRINT_RULE,
    footer: PRINT_FOOTER,
    wash: PRINT_NOTE_WASH,
    accent: PRINT_ACCENT[surface],
    accentSoft: PRINT_ACCENT_SOFT[surface],
    highlight: PRINT_HIGHLIGHT,
    link: PRINT_LINK,
    onAccent: PRINT_ON_ACCENT,
  };
}

function themeTokensFromCss(
  surface: PrintSurface,
  mode: ExportColorMode,
): ExportThemeTokens {
  const css = SURFACE_CSS[surface];
  const print = printFriendlyTokens(surface);
  return {
    appearance: "theme",
    mode,
    ink: readCssVar("--ink", print.ink),
    muted: readCssVar("--muted-foreground", print.muted),
    hairline: readCssVar("--hairline-cloud", print.hairline),
    paper: readCssVar("--surface", print.paper),
    rule: readCssVar("--hairline-cool", print.rule),
    footer: readCssVar("--muted-foreground", print.footer),
    wash: readCssVar("--surface-muted", print.wash),
    accent: readCssVar(css.accent, print.accent),
    accentSoft: readCssVar(css.accentSoft, print.accentSoft),
    highlight: mode === "dark" ? "#3d4a28" : PRINT_HIGHLIGHT,
    link: readCssVar("--link", print.link),
    onAccent: mode === "dark" ? PRINT_INK : PRINT_ON_ACCENT,
  };
}

export function tokensToRgb(tokens: ExportThemeTokens): ExportThemeRgb {
  return {
    ink: hexToRgb(tokens.ink),
    muted: hexToRgb(tokens.muted),
    hairline: hexToRgb(tokens.hairline),
    paper: hexToRgb(tokens.paper),
    rule: hexToRgb(tokens.rule),
    footer: hexToRgb(tokens.footer),
    wash: hexToRgb(tokens.wash),
    accent: hexToRgb(tokens.accent),
    accentSoft: hexToRgb(tokens.accentSoft),
  };
}

/**
 * Resolve export colors for the chosen appearance.
 * `resolvedMode` should be next-themes `resolvedTheme` ("light" | "dark").
 */
export function resolveExportTheme(
  appearance: ExportAppearance,
  surface: PrintSurface,
  resolvedMode: ExportColorMode | string | undefined = "light",
): ExportThemeTokens {
  if (appearance !== "theme") {
    return printFriendlyTokens(surface);
  }
  const mode: ExportColorMode = resolvedMode === "dark" ? "dark" : "light";
  return themeTokensFromCss(surface, mode);
}
