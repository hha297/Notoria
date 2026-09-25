import type { ContentImportTarget } from "@/lib/content-import/types";

/** Simple starter CSV templates for non-technical users. */
export function csvTemplateForTarget(target: ContentImportTarget): string {
  if (target === "vocabulary") {
    return [
      "Word,Meaning,Part of speech,Example,Tags,Notes",
      'talo,house,noun,"Minulla on talo.",home | a1,common word',
      'kirja,book,noun,"Luen kirjaa.",school,optional notes',
    ].join("\r\n");
  }

  if (target === "writing") {
    return [
      "Title,Content",
      "My weekend,\"I went to the market and bought fresh bread.\"",
      "Email draft,\"Dear friend, thank you for your help.\"",
    ].join("\r\n");
  }

  return [
    "Title,Content,Category",
    "Present tense,\"Use -n / -t / -V endings for Finnish verbs.\",grammar",
    "Word order,\"Finnish word order is flexible but SVO is common.\",usage",
  ].join("\r\n");
}

export function csvTemplateFilename(target: ContentImportTarget): string {
  return `notoria-${target}-import-template.csv`;
}
