import { beforeEach, describe, expect, it, mock } from "bun:test";

type Conn = {
  query: ReturnType<typeof mock>;
  release: ReturnType<typeof mock>;
};

let held = false;
let conn: Conn;

const pool = {
  getConnection: async () => {
    conn = {
      query: mock(async (sql: string) => {
        if (sql.includes("GET_LOCK")) {
          if (held) return [[{ got: 0 }]];
          held = true;
          return [[{ got: 1 }]];
        }
        if (sql.includes("RELEASE_LOCK")) {
          held = false;
          return [[{}]];
        }
        return [[{}]];
      }),
      release: mock(() => undefined),
    };
    return conn;
  },
};

mock.module("../db/client", () => ({ pool }));

const { withAlertJobLock } = await import("./alertJobLock");

describe("withAlertJobLock", () => {
  beforeEach(() => {
    held = false;
  });

  it("runs the critical section when the lock is free", async () => {
    const result = await withAlertJobLock(async () => "ok");
    expect(result).toBe("ok");
    expect(held).toBe(false);
    expect(conn.release).toHaveBeenCalled();
  });

  it("refuses overlapping runs while the lock is held", async () => {
    let releaseInner!: () => void;
    const blocked = new Promise<void>((resolve) => {
      releaseInner = resolve;
    });

    const first = withAlertJobLock(async () => {
      await blocked;
      return "first";
    });

    await Promise.resolve();
    await expect(withAlertJobLock(async () => "second")).rejects.toThrow(
      "Alert jobs are already running"
    );

    releaseInner();
    await expect(first).resolves.toBe("first");
  });
});
