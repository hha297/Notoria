export function slugifyFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildExportFilename(
  title: string,
  format: "pdf" | "docx",
  now = new Date(),
  prefix = "writing",
): string {
  const slug = slugifyFilenamePart(title.trim());
  const date = now.toISOString().slice(0, 10);

  if (slug) {
    return `${prefix}-${slug}.${format}`;
  }

  if (prefix === "writing") {
    return `writing_exercise_${date}.${format}`;
  }

  return `${prefix}_${date}.${format}`;
}
