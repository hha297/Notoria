"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import styles from "@/components/style/help/help.module.css";
import { mx } from "@/lib/css-module";

const FAQ_GROUPS = [
  {
    id: "gettingStarted",
    items: ["workspace", "start"],
  },
  {
    id: "accountBilling",
    items: ["account", "pro", "proFeatures"],
  },
  {
    id: "learningAi",
    items: ["learning", "ai"],
  },
  {
    id: "dataPrivacy",
    items: ["data", "backup"],
  },
] as const;

type FaqGroupId = (typeof FAQ_GROUPS)[number]["id"];
type FaqItemId = (typeof FAQ_GROUPS)[number]["items"][number];

function FaqAnswer({ id }: { id: FaqItemId }) {
  const t = useTranslations("sitePages.support.faq");

  return (
    <>
      {t.rich(`${id}.a`, {
        account: (chunks) => (
          <Link href="/account" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        settings: (chunks) => (
          <Link href="/settings" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        howToUse: (chunks) => (
          <Link href="/how-to-use" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        gettingStarted: (chunks) => (
          <Link href="/getting-started" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        vocabulary: (chunks) => (
          <Link href="/vocabulary" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        about: (chunks) => (
          <Link href="/about" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
        contact: (chunks) => (
          <Link href="/contact" className={mx(styles, "faq-inline-link")}>
            {chunks}
          </Link>
        ),
      })}
    </>
  );
}

export function SupportFaq() {
  const t = useTranslations("sitePages.support.faq");
  const baseId = useId();
  const [openId, setOpenId] = useState<FaqItemId | null>("workspace");

  return (
    <section className={mx(styles, "faq")} aria-labelledby={`${baseId}-title`}>
      <div className={mx(styles, "faq-header")}>
        <h2 id={`${baseId}-title`} className={mx(styles, "faq-title")}>
          {t("title")}
        </h2>
        <p className={mx(styles, "faq-lede")}>{t("lede")}</p>
      </div>

      <div className={mx(styles, "faq-groups")}>
        {FAQ_GROUPS.map((group) => (
          <div key={group.id} className={mx(styles, "faq-group")}>
            <h3 className={mx(styles, "faq-group-title")}>
              {t(`groups.${group.id as FaqGroupId}`)}
            </h3>

            <div className={mx(styles, "faq-list")}>
              {group.items.map((id) => {
                const open = openId === id;
                const panelId = `${baseId}-panel-${id}`;
                const triggerId = `${baseId}-trigger-${id}`;

                return (
                  <div
                    key={id}
                    className={mx(styles, "faq-item", open && "is-open")}
                  >
                    <h4 className={mx(styles, "faq-item-heading")}>
                      <button
                        id={triggerId}
                        type="button"
                        className={mx(styles, "faq-trigger")}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setOpenId(open ? null : id)}
                      >
                        <span className={mx(styles, "faq-question")}>
                          {t(`${id}.q`)}
                        </span>
                        <ChevronDown
                          className={mx(styles, "faq-chevron")}
                          aria-hidden
                        />
                      </button>
                    </h4>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      hidden={!open}
                      className={mx(styles, "faq-panel")}
                    >
                      <div className={mx(styles, "faq-answer")}>
                        <FaqAnswer id={id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
