import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingPage } from "@/components/landing/landing-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitePages.landing.meta");

  return {
    title: {
      absolute: t("title"),
    },
    description: t("description"),
    alternates: { canonical: "https://www.notoria.fi/" },
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      url: "https://www.notoria.fi/",
      siteName: "Notoria",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("twitterDescription"),
    },
  };
}

export default function PublicHomePage() {
  return <LandingPage />;
}
