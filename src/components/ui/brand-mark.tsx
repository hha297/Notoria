import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  tone?: "ink" | "sidebar";
  className?: string;
  onClick?: () => void;
};

/** Shared header brand — same logo + wordmark sizing on landing, auth, and public shells. */
export function BrandMark({
  href = "/",
  tone = "ink",
  className,
  onClick,
}: BrandMarkProps) {
  return (
    <Link
      href={href}
      aria-label="Notoria"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 max-w-full items-center gap-2.5 rounded-md outline-none",
        "transition-opacity hover:opacity-90",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Logo size="md" />
      <LogoWordmark tone={tone} />
    </Link>
  );
}
