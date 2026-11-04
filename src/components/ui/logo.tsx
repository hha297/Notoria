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
        "shrink-0 overflow-hidden rounded-sm",
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
  /** `ink` for cream surfaces; `sidebar` for the floating sidebar */
  tone?: "ink" | "sidebar";
};

export function LogoWordmark({
  className,
  tone = "sidebar",
}: LogoWordmarkProps) {
  return (
    <span
      className={cn(
        "font-heading inline-flex items-center text-[1.5rem] font-bold leading-none tracking-[-0.03em]",
        tone === "sidebar" ? "text-sidebar-foreground" : "text-ink",
        className,
      )}
    >
      Noto
      <span className="text-primary">ria</span>
    </span>
  );
}
