import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountSettings } from "@/components/account/account-settings";
import { PageHeader } from "@/components/layout/page-header";
import { getAccountUser } from "@/lib/actions/account";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const t = await getTranslations("auth");
  const sessionUser = await requireUser();
  const { billing } = await searchParams;

  if (!sessionUser?.email) {
    redirect("/sign-in");
  }

  const user = await getAccountUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("account")}
        title={t("accountSettings")}
        description={t("accountDescription")}
      />

      <AccountSettings user={user} checkoutResult={billing} />
    </div>
  );
}
