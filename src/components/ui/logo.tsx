import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

function LogoFrame({
  className,
  children,
}: LogoProps & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl border-2 border-accent-lime",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Logo({ className }: LogoProps) {
  return (
    <LogoFrame className={className}>
      <Image
        src="/logo.png"
        alt="Notoria"
        width={32}
        height={32}
        className="size-8"
        priority
      />
    </LogoFrame>
  );
}

export function LogoIcon({ className }: LogoProps) {
  return (
    <LogoFrame className={className}>
      <Image
        src="/logo.png"
        alt="Notoria"
        width={32}
        height={32}
        className="size-8"
        priority
      />
    </LogoFrame>
  );
}

export function LogoWordmark({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "font-heading text-base font-bold tracking-[-0.03em] text-sidebar-foreground",
        className,
      )}
    >
      Noto
      <span className="font-medium text-accent-lime">ria</span>
    </span>
  );
}
