/**
 * worker/src/index.ts
 *
 * Scheduled job processor — delegates all job logic to api/src/lib/alertJobs.ts
 * which uses the API's shared DB client and schema.
 *
 * Runs every hour by default (configurable via WORKER_INTERVAL_MS).
 */

import { runAllJobs } from "../../api/src/lib/alertJobs";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3600000); // 1 hour

// Run immediately on startup, then on interval
await runAllJobs();
setInterval(runAllJobs, INTERVAL_MS);
console.log(`[worker] Scheduled every ${INTERVAL_MS / 1000}s`);
