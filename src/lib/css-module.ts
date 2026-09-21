import { cn } from "@/lib/utils";

/**
 * Resolve CSS Module class names while leaving Tailwind utilities and
 * genuinely global classes untouched.
 *
 * Example: mx(styles, "guide-layout flex gap-2", isDark && "is-dark")
 */
export function mx(
  styles: Readonly<Record<string, string>>,
  ...inputs: Array<string | false | null | undefined>
) {
  return cn(
    ...inputs.flatMap((input) => {
      if (!input) return [];
      return input
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => styles[token] ?? token);
    }),
  );
}
