/**
 * Resolve a client-side meaning id to a freshly inserted DB meaning id.
 * Unknown / missing ids become null (word-level / unassigned).
 */
export function remapExampleMeaningId(
  clientMeaningId: string | null | undefined,
  clientToDbMeaningId: ReadonlyMap<string, string>,
): string | null {
  if (!clientMeaningId) return null;
  return clientToDbMeaningId.get(clientMeaningId) ?? null;
}

/** Build a client→db map after inserting meanings in the same order as `clientIds`. */
export function buildMeaningIdRemap(
  clientIds: Array<string | undefined | null>,
  insertedIds: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  const len = Math.min(clientIds.length, insertedIds.length);
  for (let i = 0; i < len; i += 1) {
    const clientId = clientIds[i];
    const dbId = insertedIds[i];
    if (clientId && dbId) map.set(clientId, dbId);
  }
  return map;
}
