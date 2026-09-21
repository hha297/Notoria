import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account/account-settings";
import { PageShell } from "@/components/layout/page-shell";
import styles from "@/components/style/account/account.module.css";
import { getAccountUser } from "@/lib/actions/account";
import { requireUser } from "@/lib/auth/session";
import { mx } from "@/lib/css-module";
import { cn } from "@/lib/utils";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const t = await getTranslations("account");
  const sessionUser = await requireUser();
  const { billing } = await searchParams;

  if (!sessionUser?.email) {
    redirect("/sign-in");
  }

  const user = await getAccountUser();

  return (
    <PageShell className="writing-atelier-shell account-atelier-shell">
      <div
        className={cn(
          "account-atelier",
          mx(
            styles,
            "writing-atelier account-atelier flex flex-col gap-10 lg:gap-12",
          ),
        )}
      >
        <header className="writing-hero">
          <div className="writing-hero-copy">
            <p className="writing-kicker">{t("eyebrow")}</p>
            <h1 className="writing-brand-title">
              {t("title")}{" "}
              <span className="text-module-account-fg">{t("highlight")}</span>
            </h1>
            <p className="writing-brand-lede">{t("description")}</p>
          </div>
        </header>

        <AccountSettings user={user} checkoutResult={billing} />
      </div>
    </PageShell>
  );
}
