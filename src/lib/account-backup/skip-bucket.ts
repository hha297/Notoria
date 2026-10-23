import type {
  BackupSkipReason,
  BackupSkipSource,
  BackupSkipSummary,
} from "./types";

type SkipEntry = {
  count: number;
  examples: string[];
  source: BackupSkipSource;
};

/** Bucket key keeps account vs backup duplicates separate for clear reporting. */
export type SkipBucket = Map<string, SkipEntry>;

function bucketKey(reason: BackupSkipReason, source: BackupSkipSource) {
  return `${source}::${reason}`;
}

export function createSkipBucket(): SkipBucket {
  return new Map();
}

export function addSkip(
  bucket: SkipBucket,
  reason: BackupSkipReason,
  source: BackupSkipSource,
  example?: string,
) {
  const key = bucketKey(reason, source);
  const current = bucket.get(key) ?? { count: 0, examples: [], source };
  current.count += 1;
  if (example && current.examples.length < 5) {
    current.examples.push(example);
  }
  bucket.set(key, current);
}

export function toSkipSummaries(bucket: SkipBucket): BackupSkipSummary[] {
  return Array.from(bucket.entries()).map(([key, value]) => {
    const reason = key.slice(key.indexOf("::") + 2) as BackupSkipReason;
    return {
      reason,
      source: value.source,
      count: value.count,
      examples: value.examples,
    };
  });
}

/** Duplicate hit: was the name already on the account, or only earlier in this backup? */
export function duplicateSkipSource(inAccount: boolean): BackupSkipSource {
  return inAccount ? "account" : "backup";
}
