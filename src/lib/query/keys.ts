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
    deck: (workspaceId: string, mode: string, filters?: unknown) =>
      ["exercises", workspaceId, "deck", mode, filters] as const,
  },
};
