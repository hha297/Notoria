import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/ui/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthPageShell({
  title,
  description,
  children,
}: AuthPageShellProps) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Card className="gap-0 overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
          <CardHeader className="gap-4 border-0 px-8 pb-6 pt-8 text-center">
            <Link
              href="/sign-in"
              className="mx-auto flex w-fit items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-90"
            >
              <Logo size="md" />
              <LogoWordmark tone="ink" />
            </Link>
            <div className="space-y-1">
              <CardTitle className="text-2xl text-ink">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 py-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
