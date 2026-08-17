import { cn } from "@/lib/utils";

/** Visual treatment for locked Pro controls that remain clickable. */
export const lockedFeatureClassName =
  "opacity-40 grayscale hover:opacity-50";

export function lockedFeatureCn(...classes: Array<string | false | null | undefined>) {
  return cn(lockedFeatureClassName, ...classes);
}
