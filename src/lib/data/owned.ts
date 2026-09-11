export async function requireOwnedRow<
  T extends { userId: string; workspaceId: string },
>(
  row: T | null | undefined,
  userId: string,
  workspaceId: string,
  notFoundMessage = "Not found",
): Promise<T> {
  if (!row || row.userId !== userId || row.workspaceId !== workspaceId) {
    throw new Error(notFoundMessage);
  }

  return row;
}
