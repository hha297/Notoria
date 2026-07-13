import { cn } from "@/lib/utils";
import * as Flags from "country-flag-icons/react/3x2";

type CountryFlagProps = {
  code: string;
  className?: string;
};

export function CountryFlag({ code, className }: CountryFlagProps) {
  const Flag = Flags[code as keyof typeof Flags];

  if (!Flag) {
    return (
      <span
        className={cn(
          "inline-block shrink-0 rounded-sm bg-muted",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <Flag
      className={cn("inline-block shrink-0 rounded-sm", className)}
      aria-hidden
    />
  );
}
