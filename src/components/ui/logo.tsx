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
        "shrink-0 overflow-hidden rounded-xl border-2 border-accent-lime",
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
        width={24}
        height={24}
        className="size-6"
        priority
      />
    </LogoFrame>
  );
}


export function LogoWordmark({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "font-heading text-2xl font-medium tracking-[-0.03em] text-sidebar-foreground",
        className,
      )}
    >
      Noto
      <span className="text-accent-lime">ria</span>
    </span>
  );
}
