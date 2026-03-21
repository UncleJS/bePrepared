import { describe, expect, it } from "bun:test";
import {
  computeAlertSeverity,
  resolveAlertUpsertResult,
  shouldEscalateSeverity,
  type AlertSeverity,
} from "./alertSeverity";

describe("alertSeverity", () => {
  it("computes overdue, due, and upcoming correctly", () => {
    const today = new Date("2026-03-06T10:00:00.000Z");

    expect(computeAlertSeverity(new Date("2026-03-05T00:00:00.000Z"), today)).toBe("overdue");
    expect(computeAlertSeverity(new Date("2026-03-06T00:00:00.000Z"), today)).toBe("due");
    expect(computeAlertSeverity(new Date("2026-03-07T00:00:00.000Z"), today)).toBe("upcoming");
  });

  it("supports a due grace window before escalating to overdue", () => {
    const today = new Date("2026-03-06T10:00:00.000Z");
    const dueAt = new Date("2026-03-05T00:00:00.000Z");

    expect(computeAlertSeverity(dueAt, today, 2)).toBe("due");
    expect(computeAlertSeverity(dueAt, new Date("2026-03-08T10:00:00.000Z"), 2)).toBe("overdue");
  });

  it("escalates severity monotonically", () => {
    expect(shouldEscalateSeverity("upcoming", "due")).toBe(true);
    expect(shouldEscalateSeverity("upcoming", "overdue")).toBe(true);
    expect(shouldEscalateSeverity("due", "overdue")).toBe(true);

    expect(shouldEscalateSeverity("due", "upcoming")).toBe(false);
    expect(shouldEscalateSeverity("overdue", "due")).toBe(false);
    expect(shouldEscalateSeverity("upcoming", "upcoming")).toBe(false);
  });

  it("keeps upsert decisions idempotent across repeated candidate runs", () => {
    const state = new Map<string, AlertSeverity>();
    const key = "house-1:inventory_lot:lot-1";
    const candidates: AlertSeverity[] = ["upcoming", "upcoming", "due", "upcoming", "overdue"];
    const decisions = candidates.map((incoming) => {
      const decision = resolveAlertUpsertResult(state.get(key) ?? null, incoming);
      if (decision === "inserted" || decision === "escalated") {
        state.set(key, incoming);
      }
      return decision;
    });

    expect(decisions).toEqual(["inserted", "unchanged", "escalated", "unchanged", "escalated"]);
    expect(state.get(key)).toBe("overdue");
  });
});
