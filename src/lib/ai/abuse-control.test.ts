import { afterEach, describe, expect, it } from "vitest";
import {
  AiBusyError,
  AI_ABUSE_POLICY,
  beginAiAbuseControl,
  RateLimitedError,
  resetAiAbuseControlForTests,
  withAiAbuseControl,
} from "@/lib/ai/abuse-control";
import { resetRateLimitForTests } from "@/lib/auth/rate-limit";
import { contentImportUsageSubject } from "@/lib/content-import/usage-subject";
import { UsageLedger } from "@/lib/billing/usage-ledger";
import { getFeatureAccess } from "@/lib/billing/plans";

afterEach(() => {
  resetAiAbuseControlForTests();
  resetRateLimitForTests();
});

describe("AI abuse control", () => {
  it("blocks concurrent editor format for the same user", async () => {
    const gate = beginAiAbuseControl("user-a", "editor_format");
    expect(() => beginAiAbuseControl("user-a", "editor_format")).toThrow(
      AiBusyError,
    );
    gate.release();
    await expect(
      withAiAbuseControl("user-a", "editor_format", async () => "ok"),
    ).resolves.toBe("ok");
  });

  it("allows concurrent users independently", () => {
    const a = beginAiAbuseControl("user-a", "editor_format");
    const b = beginAiAbuseControl("user-b", "editor_format");
    a.release();
    b.release();
  });

  it("rate-limits bursts even on unlimited plans", () => {
    const limit = AI_ABUSE_POLICY.sentence_meaning.limit;
    for (let i = 0; i < limit; i += 1) {
      const gate = beginAiAbuseControl("premium-user", "sentence_meaning");
      gate.release();
    }
    expect(() =>
      beginAiAbuseControl("premium-user", "sentence_meaning"),
    ).toThrow(RateLimitedError);
  });

  it("enforces coach refresh cooldown before provider work", () => {
    const first = beginAiAbuseControl("coach-user", "coach_refresh");
    first.release();
    expect(() => beginAiAbuseControl("coach-user", "coach_refresh")).toThrow(
      RateLimitedError,
    );
  });
});

describe("quota feature mapping (preserved entitlements)", () => {
  it("keeps Free / Pro / Premium limits for remapped surfaces", () => {
    expect(getFeatureAccess("free", "ai_writing")).toMatchObject({ limit: 1 });
    expect(getFeatureAccess("pro", "ai_writing")).toMatchObject({ limit: null });
    expect(getFeatureAccess("premium", "ai_writing")).toMatchObject({
      limit: null,
    });

    expect(getFeatureAccess("free", "ai_exercise")).toMatchObject({ limit: 3 });
    expect(getFeatureAccess("pro", "ai_exercise")).toMatchObject({
      limit: null,
    });

    expect(getFeatureAccess("free", "ai_reading")).toMatchObject({ limit: 1 });
    expect(getFeatureAccess("pro", "ai_reading")).toMatchObject({ limit: 10 });
    expect(getFeatureAccess("premium", "ai_reading")).toMatchObject({
      limit: null,
    });

    expect(getFeatureAccess("free", "content_import")).toMatchObject({
      limit: 0,
    });
    expect(getFeatureAccess("pro", "content_import")).toMatchObject({
      limit: null,
    });
  });
});

describe("content-import shared subject", () => {
  it("is stable for the same file and avoids a second charge", () => {
    const buffer = Buffer.from("word\tmeaning\nhello\tchao");
    const subject = contentImportUsageSubject("vocabulary", buffer);
    expect(contentImportUsageSubject("vocabulary", buffer)).toBe(subject);
    expect(contentImportUsageSubject("writing", buffer)).not.toBe(subject);

    const ledger = new UsageLedger();
    // Simulate a Free-like finite content_import quota for subject reuse.
    const analyze = ledger.reserve({
      userId: "u",
      feature: "content_import",
      usageDate: "2026-10-15",
      limit: 1,
      subjectId: subject,
    });
    const confirm = ledger.reserve({
      userId: "u",
      feature: "content_import",
      usageDate: "2026-10-15",
      limit: 1,
      subjectId: subject,
    });
    expect(analyze.ok && confirm.ok).toBe(true);
    if (analyze.ok && confirm.ok) {
      expect(confirm.reused).toBe(true);
    }
    expect(ledger.getCount("u", "content_import", "2026-10-15")).toBe(1);
  });

  it("blocks a second different import when Free-style quota is exhausted", () => {
    const ledger = new UsageLedger();
    const first = ledger.reserve({
      userId: "u",
      feature: "content_import",
      usageDate: "2026-10-15",
      limit: 1,
      subjectId: "content-import:a",
    });
    expect(first.ok).toBe(true);
    const second = ledger.reserve({
      userId: "u",
      feature: "content_import",
      usageDate: "2026-10-15",
      limit: 1,
      subjectId: "content-import:b",
    });
    expect(second.ok).toBe(false);
  });
});

describe("exhausted Free quotas for remapped features", () => {
  it("blocks editor format after Free ai_writing is used", () => {
    const ledger = new UsageLedger();
    expect(
      ledger.reserve({
        userId: "free",
        feature: "ai_writing",
        usageDate: "2026-10-15",
        limit: 1,
      }).ok,
    ).toBe(true);
    expect(
      ledger.reserve({
        userId: "free",
        feature: "ai_writing",
        usageDate: "2026-10-15",
        limit: 1,
      }).ok,
    ).toBe(false);
  });

  it("blocks sentence-meaning after Free ai_exercise is exhausted", () => {
    const ledger = new UsageLedger();
    for (let i = 0; i < 3; i += 1) {
      expect(
        ledger.reserve({
          userId: "free",
          feature: "ai_exercise",
          usageDate: "2026-10-15",
          limit: 3,
        }).ok,
      ).toBe(true);
    }
    expect(
      ledger.reserve({
        userId: "free",
        feature: "ai_exercise",
        usageDate: "2026-10-15",
        limit: 3,
      }).ok,
    ).toBe(false);
  });

  it("blocks reading OCR after Free ai_reading is used", () => {
    const ledger = new UsageLedger();
    expect(
      ledger.reserve({
        userId: "free",
        feature: "ai_reading",
        usageDate: "2026-10-15",
        limit: 1,
        subjectId: "reading-ocr:p1",
      }).ok,
    ).toBe(true);
    expect(
      ledger.reserve({
        userId: "free",
        feature: "ai_reading",
        usageDate: "2026-10-15",
        limit: 1,
        subjectId: "reading-ocr:p2",
      }).ok,
    ).toBe(false);
  });
});
