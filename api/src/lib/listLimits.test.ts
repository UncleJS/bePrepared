import { describe, expect, it } from "bun:test";
import { DEFAULT_LIST_LIMIT, markTruncated, mysqlAffectedRows } from "./listLimits";

describe("listLimits", () => {
  it("marks truncated when row count meets the limit", () => {
    const set = { headers: {} as Record<string, string | number> };
    markTruncated(set, DEFAULT_LIST_LIMIT);
    expect(set.headers["x-truncated"]).toBe("true");
  });

  it("does not mark truncated below the limit", () => {
    const set = { headers: {} as Record<string, string | number> };
    markTruncated(set, DEFAULT_LIST_LIMIT - 1);
    expect(set.headers["x-truncated"]).toBeUndefined();
  });

  it("reads mysql affectedRows from result shapes", () => {
    expect(mysqlAffectedRows([{ affectedRows: 2 }])).toBe(2);
    expect(mysqlAffectedRows({ affectedRows: 1 })).toBe(1);
    expect(mysqlAffectedRows(undefined)).toBe(0);
  });
});
