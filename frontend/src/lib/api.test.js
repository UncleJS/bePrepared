import { afterEach, describe, expect, it } from "bun:test";
import { daysUntil, fmtDate, fmtTs, resolveClientHouseholdId } from "./api";

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalDateNow = Date.now;

afterEach(() => {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }

  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }

  Date.now = originalDateNow;
});

function setClientCookie(cookie) {
  globalThis.window = {};
  globalThis.document = { cookie };
}

function expectedLocalTimestamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

describe("frontend api utils", () => {
  it("prefers active-household cookie for admins", () => {
    setClientCookie("bp_active_household_id=admin-household");
    const resolved = resolveClientHouseholdId({ householdId: "default-household", isAdmin: true });
    expect(resolved).toBe("admin-household");
  });

  it("falls back to session household for non-admins", () => {
    setClientCookie("bp_active_household_id=ignored-for-non-admin");
    const resolved = resolveClientHouseholdId({ householdId: "default-household", isAdmin: false });
    expect(resolved).toBe("default-household");
  });

  it("formats timestamps consistently", () => {
    const iso = "2026-03-05T14:30:12.000Z";
    expect(fmtTs(iso)).toBe(expectedLocalTimestamp(iso));
    expect(fmtTs(null)).toBe("—");
  });

  it("formats date strings safely", () => {
    expect(fmtDate("2026-03-05T14:30:12.000Z")).toBe("2026-03-05");
    expect(fmtDate(undefined)).toBe("—");
  });

  it("computes daysUntil with positive and overdue values", () => {
    const now = new Date("2026-03-05T00:00:00.000Z").getTime();
    Date.now = () => now;

    expect(daysUntil("2026-03-06T00:00:00.000Z")).toBe(1);
    expect(daysUntil("2026-03-04T00:00:00.000Z")).toBe(-1);
    expect(daysUntil(null)).toBeNull();
  });
});
