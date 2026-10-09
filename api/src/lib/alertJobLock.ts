import { pool } from "../db/client";

const LOCK_NAME = "beprepared:alertJobs";

/**
 * Cross-process mutex so the worker tick and admin run-job cannot overlap.
 * Holds a dedicated pool connection for the MySQL named lock for the duration
 * of fn; GET_LOCK is connection-scoped.
 */
export async function withAlertJobLock<T>(fn: () => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query("SELECT GET_LOCK(?, 0) AS got", [LOCK_NAME]);
    const got = Number((rows as Array<{ got: number }>)[0]?.got ?? 0);
    if (got !== 1) {
      throw new Error("Alert jobs are already running");
    }
    try {
      return await fn();
    } finally {
      await conn.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    }
  } finally {
    conn.release();
  }
}
