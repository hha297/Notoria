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
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-[420px]">
        <Card className="gap-0 overflow-visible rounded-xl border border-hairline-cloud bg-card p-0 shadow-none ring-0 md:rounded-none md:border-0 md:bg-transparent">
          <CardHeader className="gap-4 border-0 px-5 pb-4 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-8">
            <Link
              href="/sign-in"
              className="mx-auto flex w-fit items-center gap-2.5 rounded-lg outline-none transition-opacity hover:opacity-90"
            >
              <Logo size="md" />
              <LogoWordmark tone="ink" />
            </Link>
            <div className="space-y-1.5">
              <CardTitle className="text-xl text-ink sm:text-2xl">{title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-5 sm:px-8 sm:py-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
