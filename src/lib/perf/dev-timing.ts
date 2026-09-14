/**
 * Request/query timing. Silent in production unless PERF_TIMING=1.
 * Never logs user ids, emails, or payload contents.
 */
const PERF_TIMING =
  process.env.PERF_TIMING === "1" ||
  (process.env.NODE_ENV === "development" && process.env.PERF_TIMING !== "0");

function roundMs(ms: number) {
  return Math.round(ms * 10) / 10;
}

export function isPerfTimingEnabled() {
  return PERF_TIMING;
}

export function logPerf(label: string, ms: number) {
  if (!PERF_TIMING) return;
  console.info(`[perf] ${label}: ${roundMs(ms)}ms`);
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!PERF_TIMING) {
    return fn();
  }

  const started = performance.now();
  try {
    return await fn();
  } finally {
    logPerf(label, performance.now() - started);
  }
}

/** @deprecated Use withTiming */
export const withDevTiming = withTiming;

export function createPerfTimer(scope: string) {
  const started = performance.now();
  const marks: Array<{ label: string; ms: number }> = [];

  return {
    async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
      if (!PERF_TIMING) {
        return fn();
      }
      const markStarted = performance.now();
      try {
        return await fn();
      } finally {
        marks.push({ label, ms: roundMs(performance.now() - markStarted) });
      }
    },
    finish() {
      if (!PERF_TIMING) return;
      const total = roundMs(performance.now() - started);
      const detail =
        marks.length > 0
          ? ` (${marks.map((mark) => `${mark.label} ${mark.ms}ms`).join(", ")})`
          : "";
      console.info(`[perf] ${scope}: ${total}ms${detail}`);
    },
  };
}
