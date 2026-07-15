import Image from "next/image";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-2xl",
} as const;

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = getInitials(name) || "U";
  const dimension = imageSizes[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-lime/20 font-semibold text-accent-lime",
        sizeClasses[size],
        className,
      )}
    >
      {image ? (
        <Image
          src={image}
          alt={name}
          width={dimension}
          height={dimension}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
