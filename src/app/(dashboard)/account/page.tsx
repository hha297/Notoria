import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const t = await getTranslations("auth");
  const user = await requireUser();

  if (!user?.email) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t("account")}
        title={t("accountSettings")}
        description={t("accountDescription")}
      />

      <div className="card-surface max-w-lg space-y-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("name")}
          </p>
          <p className="mt-1 font-medium text-ink">{user.name}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("email")}
          </p>
          <p className="mt-1 font-medium text-ink">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
