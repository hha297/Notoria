/**
 * Canonical TanStack Query keys. Every key includes workspaceId (or user scope)
 * so workspace A can never read workspace B's cache.
 *
 * Invalidation map (mutations → queries):
 * - vocabulary CRUD        → vocabulary.all(workspaceId)
 * - vocabulary synonym add → vocabulary.synonymOptions + vocabulary.list
 * - theory CRUD            → theory.all(workspaceId)
 * - writing CRUD           → writing.all(workspaceId)
 * - listening CRUD         → listening.all(workspaceId)
 * - speaking CRUD          → speaking.all(workspaceId)
 * - exercise studio/import → exercises.studio(workspaceId)
 * - folder tree            → folders.list(workspaceId, section)
 * - workspace switch       → new workspaceId (old keys remain until gc)
 */
export const queryKeys = {
  vocabulary: {
    all: (workspaceId: string) => ["vocabulary", workspaceId] as const,
    list: (workspaceId: string, filters?: unknown) =>
      ["vocabulary", workspaceId, "list", filters] as const,
    detail: (workspaceId: string, id: string) =>
      ["vocabulary", workspaceId, "word", id] as const,
    synonymOptions: (workspaceId: string) =>
      ["vocabulary", workspaceId, "synonym-options"] as const,
  },
  writing: {
    all: (workspaceId: string) => ["writing", workspaceId] as const,
    list: (workspaceId: string, filters?: unknown) =>
      ["writing", workspaceId, "list", filters] as const,
    detail: (workspaceId: string, id: string) =>
      ["writing", workspaceId, "document", id] as const,
  },
  theory: {
    all: (workspaceId: string) => ["theory", workspaceId] as const,
    list: (workspaceId: string, filters?: unknown) =>
      ["theory", workspaceId, "list", filters] as const,
    detail: (workspaceId: string, id: string) =>
      ["theory", workspaceId, "note", id] as const,
  },
  listening: {
    all: (workspaceId: string) => ["listening", workspaceId] as const,
    list: (workspaceId: string, filters?: unknown) =>
      ["listening", workspaceId, "list", filters] as const,
    detail: (workspaceId: string, id: string) =>
      ["listening", workspaceId, "lesson", id] as const,
  },
  speaking: {
    all: (workspaceId: string) => ["speaking", workspaceId] as const,
    list: (workspaceId: string, filters?: unknown) =>
      ["speaking", workspaceId, "list", filters] as const,
    detail: (workspaceId: string, id: string) =>
      ["speaking", workspaceId, "session", id] as const,
  },
  exercises: {
    studio: (workspaceId: string) =>
      ["exercises", workspaceId, "studio"] as const,
    deck: (workspaceId: string, mode: string, filters?: unknown) =>
      ["exercises", workspaceId, "deck", mode, filters] as const,
  },
  folders: {
    list: (workspaceId: string, section: string) =>
      ["folders", workspaceId, section] as const,
  },
  workspace: {
    customTags: (workspaceId: string) =>
      ["workspace", workspaceId, "custom-tags"] as const,
  },
  search: {
    query: (workspaceId: string, q: string) =>
      ["search", workspaceId, q] as const,
  },
};
