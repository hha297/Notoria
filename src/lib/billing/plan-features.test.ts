import { describe, expect, it } from "vitest";
import {
  formatPlanCell,
  getPlanComparisonRows,
} from "@/lib/billing/plan-features";
import { FREE_DAILY_QUOTAS, VISIBLE_PREMIUM_FEATURES } from "@/lib/billing/plans";

describe("plan comparison metadata", () => {
  it("exposes Free AI quotas from the plan SoT", () => {
    const speaking = getPlanComparisonRows().find((row) => row.id === "ai_meeting");
    expect(speaking?.nameKey).toBe("aiSpeakingTutor");
    expect(speaking?.cells.free).toEqual({
      kind: "quota",
      limit: FREE_DAILY_QUOTAS.ai_meeting,
    });
    expect(speaking?.cells.pro).toEqual({ kind: "quota", limit: 10 });
    expect(speaking?.cells.premium).toEqual({ kind: "unlimited" });
  });

  it("keeps lightweight AI unlimited on paid plans", () => {
    const writing = getPlanComparisonRows().find((row) => row.id === "ai_writing");
    expect(writing?.nameKey).toBe("aiWritingSupport");
    expect(writing?.cells.pro).toEqual({ kind: "unlimited" });
    expect(writing?.cells.premium).toEqual({ kind: "unlimited" });
    const listening = getPlanComparisonRows().find(
      (row) => row.id === "ai_listening_transcript",
    );
    expect(listening?.cells.pro).toEqual({ kind: "quota", limit: 10 });
    expect(listening?.cells.premium).toEqual({ kind: "unlimited" });
  });

  it("does not duplicate AI Speaking Tutor as a second boolean row", () => {
    const ids = getPlanComparisonRows().map((row) => row.id);
    expect(ids).toContain("speaking");
    expect(ids).not.toContain("ai_speaking_tutor");
    expect(ids.filter((id) => id === "ai_meeting")).toHaveLength(1);
  });

  it("marks Listening and Speaking available on all plans", () => {
    for (const id of ["listening", "speaking"] as const) {
      const row = getPlanComparisonRows().find((r) => r.id === id);
      expect(row?.category).toBe("core");
      expect(row?.cells).toEqual({
        free: { kind: "included" },
        pro: { kind: "included" },
        premium: { kind: "included" },
      });
    }
  });

  it("only advertises visible Premium capabilities", () => {
    const personalized = getPlanComparisonRows().filter(
      (row) => row.category === "personalized",
    );
    for (const row of personalized) {
      expect(row.premiumCapability).toBeTruthy();
      expect(VISIBLE_PREMIUM_FEATURES).toContain(row.premiumCapability);
    }
    expect(personalized.some((row) => row.id === "ai_learning_coach")).toBe(true);
    expect(personalized.some((row) => row.id === "practice_from_mistakes")).toBe(
      true,
    );
  });

  it("can return Premium delta rows for Pro users", () => {
    const delta = getPlanComparisonRows({ premiumDeltaOnly: true });
    expect(delta.every((row) => row.category === "personalized")).toBe(true);
    expect(delta.every((row) => row.cells.pro.kind === "unavailable")).toBe(true);
    expect(
      delta.every(
        (row) =>
          row.cells.premium.kind === "included" ||
          row.cells.premium.kind === "quota",
      ),
    ).toBe(true);
    expect(delta.some((row) => row.id === "ask_learning_coach")).toBe(true);
  });

  it("formats scannable cells", () => {
    const labels = {
      included: "✓",
      unavailable: "—",
      unlimited: "Unlimited",
      limited: "Limited",
      perDay: (n: number) => `${n}/day`,
    };
    expect(formatPlanCell({ kind: "included" }, labels)).toBe("✓");
    expect(formatPlanCell({ kind: "unavailable" }, labels)).toBe("—");
    expect(formatPlanCell({ kind: "quota", limit: 3 }, labels)).toBe("3/day");
    expect(formatPlanCell({ kind: "unlimited" }, labels)).toBe("Unlimited");
  });
});
