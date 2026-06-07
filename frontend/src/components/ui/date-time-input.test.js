import { describe, expect, it } from "bun:test";
import { sanitizeTimeInput, composeDateTime, setTimeSegment } from "./date-time-input";

describe("sanitizeTimeInput", () => {
  it("auto-inserts colons while typing", () => {
    expect(sanitizeTimeInput("1", true)).toBe("1");
    expect(sanitizeTimeInput("13", true)).toBe("13");
    expect(sanitizeTimeInput("133", true)).toBe("13:3");
    expect(sanitizeTimeInput("1330", true)).toBe("13:30");
    expect(sanitizeTimeInput("133045", true)).toBe("13:30:45");
  });

  it("strips non-digits", () => {
    expect(sanitizeTimeInput("13:30:45", true)).toBe("13:30:45");
    expect(sanitizeTimeInput("1a3b3c0", true)).toBe("13:30");
  });

  it("caps length without seconds", () => {
    expect(sanitizeTimeInput("133045", false)).toBe("13:30");
  });
});

describe("composeDateTime", () => {
  it("emits yyyy-MM-dd HH:mm:ss", () => {
    expect(composeDateTime("2026-06-07", "13:30:45", true)).toBe("2026-06-07 13:30:45");
  });

  it("pads missing time segments with zeros", () => {
    expect(composeDateTime("2026-06-07", "13", true)).toBe("2026-06-07 13:00:00");
    expect(composeDateTime("2026-06-07", "", true)).toBe("2026-06-07 00:00:00");
  });

  it("forces :00 seconds when seconds are disabled", () => {
    expect(composeDateTime("2026-06-07", "13:30", false)).toBe("2026-06-07 13:30:00");
  });

  it("returns empty for fully empty input", () => {
    expect(composeDateTime("", "", true)).toBe("");
  });
});

describe("setTimeSegment", () => {
  it("sets a segment and defaults the others to 00", () => {
    expect(setTimeSegment("", "hour", "13")).toBe("13:00:00");
    expect(setTimeSegment("13:00:00", "minute", "45")).toBe("13:45:00");
    expect(setTimeSegment("13:45:00", "second", "05")).toBe("13:45:05");
  });

  it("preserves untouched segments", () => {
    expect(setTimeSegment("13:45:05", "hour", "08")).toBe("08:45:05");
  });
});
