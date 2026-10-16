/** Client-safe admin content module ids (no DB imports). */

export const ADMIN_CONTENT_MODULES = [
  "vocabulary",
  "theory",
  "writing",
  "exercises",
  "listening",
  "reading",
  "speaking",
  "inbox",
  "folders",
] as const;

export type AdminContentModule = (typeof ADMIN_CONTENT_MODULES)[number];

export function isAdminContentModule(
  value: string,
): value is AdminContentModule {
  return (ADMIN_CONTENT_MODULES as readonly string[]).includes(value);
}
