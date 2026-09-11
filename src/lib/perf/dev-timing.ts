export async function withDevTiming<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const started = performance.now();
  try {
    return await fn();
  } finally {
    const elapsedMs = performance.now() - started;
    console.info(`[dev-timing] ${label}: ${elapsedMs.toFixed(1)}ms`);
  }
}
