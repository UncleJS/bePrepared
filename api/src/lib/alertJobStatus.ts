export type JobCounters = {
  inserted: number;
  escalated: number;
  skipped: number;
  errors: number;
};

export type RunMetrics = {
  expiry: JobCounters;
  replacement: JobCounters;
  maintenance: JobCounters;
};

export class AlertJobsFailedError extends Error {
  readonly metrics: RunMetrics;

  constructor(message: string, metrics: RunMetrics) {
    super(message);
    this.name = "AlertJobsFailedError";
    this.metrics = metrics;
  }
}

export function countJobErrors(metrics: RunMetrics): number {
  return metrics.expiry.errors + metrics.replacement.errors + metrics.maintenance.errors;
}

export function assertRunSucceeded(metrics: RunMetrics): void {
  const errorCount = countJobErrors(metrics);
  if (errorCount > 0) {
    throw new AlertJobsFailedError(`Alert jobs finished with ${errorCount} error(s)`, metrics);
  }
}
