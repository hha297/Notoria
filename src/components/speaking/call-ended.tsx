"use client";

import { PhoneOff } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type CallEndedProps = {
  sessionId: string;
};

export function CallEnded({ sessionId }: CallEndedProps) {
  const t = useTranslations("speaking.call");

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
        <PhoneOff className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="heading-xl text-white">{t("endedTitle")}</h1>
        <p className="max-w-md text-sm text-white/70">{t("endedDescription")}</p>
      </div>
      <Link
        href={`/speaking/${sessionId}`}
        className="inline-flex h-10 items-center rounded-md bg-accent-lime px-4 text-sm font-bold uppercase tracking-[0.2px] text-ink hover:bg-accent-lime/90"
      >
        {t("back")}
      </Link>
    </div>
  );
}
