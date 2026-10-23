/**
 * Client session checks. There is no 60-second poll.
 * next-auth refetches when the tab becomes visible again, and any
 * navigation runs the server session callback. Role metadata refreshes
 * on the server after ROLE_REFRESH_MS, on whichever request comes next.
 */
export const AUTH_SESSION_REFETCH_INTERVAL = 0;
export const AUTH_SESSION_REFETCH_ON_WINDOW_FOCUS = true;
