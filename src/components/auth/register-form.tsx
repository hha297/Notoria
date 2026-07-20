"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { registerUser } from "@/lib/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await registerUser({ name, email, password });

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("signInAfterRegisterFailed"));
        router.push("/sign-in");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "EMAIL_EXISTS") {
        setError(t("emailExists"));
        return;
      }

      setError(t("registerFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 bg-background md:h-8 md:bg-transparent"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 bg-background md:h-8 md:bg-transparent"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-11 bg-background md:h-8 md:bg-transparent"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="h-11 w-full md:h-9" disabled={isLoading}>
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {t("createAccount")}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-ink underline-offset-4 hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
