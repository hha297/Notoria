type AppRouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/**
 * Navigate first, then fire an optional toast so notifications never delay routing.
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
