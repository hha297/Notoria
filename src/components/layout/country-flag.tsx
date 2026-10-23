import { cn } from "@/lib/utils";
import * as Flags3x2 from "country-flag-icons/react/3x2";
import * as Flags1x1 from "country-flag-icons/react/1x1";

type CountryFlagProps = {
  code: string;
  className?: string;
  /** Square flags for circular badges (default: wide 3×2). */
  square?: boolean;
};

export function CountryFlag({
  code,
  className,
  square = false,
}: CountryFlagProps) {
  const set = square ? Flags1x1 : Flags3x2;
  const Flag = set[code as keyof typeof set];

  if (!Flag) {
    return (
      <span
        className={cn(
          "inline-block shrink-0 bg-muted",
          square ? "rounded-full" : "rounded-sm",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <Flag
      className={cn(
        "inline-block shrink-0",
        square ? "rounded-full" : "rounded-sm",
        className,
      )}
      aria-hidden
    />
  );
}
