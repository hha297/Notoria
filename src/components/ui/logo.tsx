import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  size?: "sm" | "md";
};

function LogoFrame({
  className,
  children,
}: LogoProps & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-xl border-2 border-accent-lime",
        className,
      )}
    >
      {children}
    </div>
  );
}

const logoSizes = {
  sm: { frame: "size-6", image: 24 },
  md: { frame: "size-9", image: 36 },
} as const;

export function Logo({ className, size = "sm" }: LogoProps) {
  const dimensions = logoSizes[size];

  return (
    <LogoFrame className={cn(dimensions.frame, className)}>
      <Image
        src="/logo.png"
        alt="Notoria"
        width={dimensions.image}
        height={dimensions.image}
        className="size-full"
        priority
      />
    </LogoFrame>
  );
}

type LogoWordmarkProps = LogoProps & {
  /** `ink` for light backgrounds; `sidebar` for the dark sidebar */
  tone?: "ink" | "sidebar";
};

export function LogoWordmark({
  className,
  tone = "sidebar",
}: LogoWordmarkProps) {
  return (
    <span
      className={cn(
        "font-heading text-2xl font-medium tracking-[-0.03em]",
        tone === "sidebar" ? "text-sidebar-foreground" : "text-ink",
        className,
      )}
    >
      Noto
      <span className="text-accent-lime">ria</span>
    </span>
  );
}
