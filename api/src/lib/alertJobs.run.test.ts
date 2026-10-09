import { describe, expect, it } from "bun:test";
import { AlertJobsFailedError, assertRunSucceeded, type RunMetrics } from "./alertJobStatus";

function metrics(errors: number): RunMetrics {
  return {
    expiry: { inserted: 0, escalated: 0, skipped: 0, errors },
    replacement: { inserted: 1, escalated: 0, skipped: 0, errors: 0 },
    maintenance: { inserted: 0, escalated: 0, skipped: 0, errors: 0 },
  };
}

describe("alert job run status", () => {
  it("accepts a run with zero processor errors", () => {
    expect(() => assertRunSucceeded(metrics(0))).not.toThrow();
  });

  it("fails the run when any processor recorded errors", () => {
    expect(() => assertRunSucceeded(metrics(2))).toThrow(AlertJobsFailedError);
  });
});
