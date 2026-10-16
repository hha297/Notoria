/**
 * Controlled dismiss for the workspace search results panel.
 * Keeps the persistent trigger/input; only closes the expanded overlay.
 */
export type SearchPanelDismissState = {
  open: boolean;
  pendingEnter: boolean;
};

export function dismissSearchPanel(
  _state: SearchPanelDismissState,
): SearchPanelDismissState {
  return { open: false, pendingEnter: false };
}

/** Delayed fetch completion must not reopen a user-closed panel. */
export function shouldApplyPendingEnterNavigation(open: boolean): boolean {
  return open;
}
