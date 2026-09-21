/**
 * Server-only helpers for auth UI. Do not import from client components.
 */
export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
