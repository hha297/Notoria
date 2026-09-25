import {
  fieldsForTarget,
  normalizeHeader,
  requiredFieldsForTarget,
} from "@/lib/content-import/fields";
import type {
  ColumnMapping,
  ContentImportTarget,
  ImportFieldId,
} from "@/lib/content-import/types";

function bestFieldMatch(
  header: string,
  target: ContentImportTarget,
  used: Set<ImportFieldId>,
): ImportFieldId {
  const normalized = normalizeHeader(header);
  if (!normalized) return "ignore";

  const fields = fieldsForTarget(target);
  let best: { id: ImportFieldId; score: number } | null = null;

  for (const field of fields) {
    if (used.has(field.id)) continue;
    for (const alias of field.aliases) {
      const a = normalizeHeader(alias);
      let score = 0;
      if (normalized === a) score = 100;
      else if (normalized.includes(a) || a.includes(normalized)) score = 70;
      else {
        // token overlap
        const left = new Set(normalized.split(" "));
        const right = a.split(" ");
        const overlap = right.filter((t) => left.has(t)).length;
        if (overlap > 0) score = 40 + overlap * 10;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { id: field.id, score };
      }
    }
  }

  return best && best.score >= 40 ? best.id : "ignore";
}

/** Suggest Notoria field mappings for CSV headers. */
export function suggestColumnMappings(
  headers: string[],
  target: ContentImportTarget,
): ColumnMapping[] {
  const used = new Set<ImportFieldId>();
  const mappings: ColumnMapping[] = [];

  // Prefer required fields first by sorting candidates with higher alias priority
  for (let i = 0; i < headers.length; i++) {
    const field = bestFieldMatch(headers[i] ?? "", target, used);
    if (field !== "ignore") used.add(field);
    mappings.push({
      sourceColumn: headers[i] ?? `Column ${i + 1}`,
      sourceIndex: i,
      field,
    });
  }

  return mappings;
}

export function applyMappingOverrides(
  mappings: ColumnMapping[],
  overrides: Array<{ sourceIndex: number; field: ImportFieldId }>,
): ColumnMapping[] {
  const next = mappings.map((m) => ({ ...m }));
  for (const override of overrides) {
    const row = next.find((m) => m.sourceIndex === override.sourceIndex);
    if (!row) continue;
    // Clear previous assignment of this field (except ignore)
    if (override.field !== "ignore") {
      for (const m of next) {
        if (m.field === override.field) m.field = "ignore";
      }
    }
    row.field = override.field;
  }
  return next;
}

export function missingRequiredMappings(
  mappings: ColumnMapping[],
  target: ContentImportTarget,
): ImportFieldId[] {
  const mapped = new Set(
    mappings.filter((m) => m.field !== "ignore").map((m) => m.field),
  );
  return requiredFieldsForTarget(target).filter((id) => !mapped.has(id));
}

export function unmappedSourceColumns(mappings: ColumnMapping[]): string[] {
  return mappings.filter((m) => m.field === "ignore").map((m) => m.sourceColumn);
}

export function cellForField(
  row: string[],
  mappings: ColumnMapping[],
  field: ImportFieldId,
): string {
  const map = mappings.find((m) => m.field === field);
  if (!map) return "";
  return (row[map.sourceIndex] ?? "").trim();
}

export function splitMultiValue(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(/\s*[|;/]\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
