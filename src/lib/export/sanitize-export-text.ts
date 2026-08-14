/**
 * Strip characters that Chakra Petch typically cannot render,
 * so PDF/DOCX exports do not show missing-glyph boxes.
 * Letters, numbers, punctuation, Vietnamese/Finnish Latin, and Thai are kept.
 */
export function sanitizeExportText(value: string) {
  if (!value) return value;

  let result = "";
  for (const char of value) {
    if (isExportSafeChar(char)) {
      result += char;
    }
  }
  return result;
}

function isExportSafeChar(char: string) {
  const code = char.codePointAt(0);
  if (code === undefined) return false;

  if (
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0d ||
    code === 0x20 ||
    code === 0xa0
  ) {
    return true;
  }

  if (code >= 0x21 && code <= 0x7e) return true;
  if (code >= 0xa1 && code <= 0x024f) return true;
  if (code >= 0x1e00 && code <= 0x1eff) return true;
  if (code >= 0x0300 && code <= 0x036f) return true;
  if (code >= 0x0e00 && code <= 0x0e7f) return true;
  if (code >= 0x20a0 && code <= 0x20cf) return true;

  switch (code) {
    case 0x2013:
    case 0x2014:
    case 0x2018:
    case 0x2019:
    case 0x201c:
    case 0x201d:
    case 0x2022:
    case 0x2023:
    case 0x2026:
    case 0x2212:
      return true;
    default:
      return false;
  }
}
