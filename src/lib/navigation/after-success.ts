type AppRouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/**
 * Navigate first, then fire an optional toast so notifications never delay routing.
 *
 * Prefer a single soft navigation. Dual soft+hard fallbacks cause visible
 * flickers (list → form → list) when App Router and a full reload race.
 */
export function navigateAfterSuccess(
  router: AppRouterLike,
  href: string,
  options?: {
    method?: "push" | "replace";
    toast?: () => void;
  },
) {
  const method = options?.method ?? "replace";
  router[method](href);
  options?.toast?.();
}
