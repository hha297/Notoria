"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import styles from "@/components/style/billing/plan-comparison.module.css";
import { mx } from "@/lib/css-module";
import {
  PLAN_FEATURE_CATEGORIES,
  formatPlanCell,
  getPlanComparisonRows,
  type PlanCellDisplay,
  type PlanFeatureCategory,
} from "@/lib/billing/plan-features";
import type { PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type PlanComparisonTableProps = {
  /** Current entitlement plan — highlights the matching column. */
  currentPlan?: PlanId;
  /** Pro users: only Premium delta rows. */
  premiumDeltaOnly?: boolean;
  className?: string;
};

const PLAN_COLUMNS: PlanId[] = ["free", "pro", "premium"];

function cellAria(cell: PlanCellDisplay, label: string) {
  return label;
}

export function PlanComparisonTable({
  currentPlan,
  premiumDeltaOnly = false,
  className,
}: PlanComparisonTableProps) {
  const t = useTranslations("billing");
  const rows = getPlanComparisonRows({ premiumDeltaOnly });
  const plans = premiumDeltaOnly ? (["premium"] as PlanId[]) : PLAN_COLUMNS;

  const labels = {
    included: "✓",
    unavailable: "—",
    unlimited: t("cell.unlimited"),
    limited: t("cell.limited"),
    perDay: (n: number) => t("cell.perDay", { count: n }),
  };

  const byCategory = PLAN_FEATURE_CATEGORIES.map((category) => ({
    category,
    rows: rows.filter((row) => row.category === category),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className={cn(mx(styles, "plan-compare"), className)}>
      <div className={mx(styles, "plan-compare-scroll")}>
        <table className={mx(styles, "plan-compare-table")}>
          <caption className="sr-only">{t("compare.tableCaption")}</caption>
          <thead>
            <tr>
              <th scope="col" className={mx(styles, "plan-compare-feature-head")}>
                {t("compare.feature")}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan}
                  scope="col"
                  className={cn(
                    mx(styles, "plan-compare-plan-head"),
                    currentPlan === plan && mx(styles, "is-current"),
                  )}
                >
                  {t(`compare.${plan}` as "compare.free")}
                  {currentPlan === plan ? (
                    <span className={mx(styles, "plan-compare-current")}>
                      {t("compare.current")}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byCategory.map((group) => (
              <CategoryRows
                key={group.category}
                category={group.category}
                planCount={plans.length}
                title={t(`compare.categories.${group.category}` as "compare.categories.core")}
              >
                {group.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className={mx(styles, "plan-compare-feature")}>
                      {t(`features.${row.nameKey}` as "features.vocabulary")}
                    </th>
                    {plans.map((plan) => {
                      const cell = row.cells[plan];
                      const text =
                        cell.kind === "quota"
                          ? t(
                              `cell.quotaPerDay.${row.id}` as "cell.quotaPerDay.ai_meeting",
                              { count: cell.limit },
                            )
                          : formatPlanCell(cell, labels);
                      return (
                        <td
                          key={plan}
                          className={cn(
                            mx(styles, "plan-compare-cell"),
                            cell.kind === "included" && mx(styles, "is-yes"),
                            cell.kind === "unavailable" && mx(styles, "is-no"),
                            currentPlan === plan && mx(styles, "is-current"),
                          )}
                          aria-label={cellAria(cell, text)}
                        >
                          <span aria-hidden={cell.kind === "included" || cell.kind === "unavailable"}>
                            {text}
                          </span>
                          {cell.kind === "included" ? (
                            <span className="sr-only">{t("cell.includedSr")}</span>
                          ) : null}
                          {cell.kind === "unavailable" ? (
                            <span className="sr-only">{t("cell.unavailableSr")}</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </CategoryRows>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRows({
  category,
  title,
  planCount,
  children,
}: {
  category: PlanFeatureCategory;
  title: string;
  planCount: number;
  children: ReactNode;
}) {
  return (
    <>
      <tr className={mx(styles, "plan-compare-category")} data-category={category}>
        <th scope="colgroup" colSpan={planCount + 1}>
          {title}
        </th>
      </tr>
      {children}
    </>
  );
}
